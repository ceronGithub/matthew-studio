/**
 * FILE: app/api/checkout/route.ts
 * ROLE: Public — checkout submission (cart_checkout_specification.md
 * Section 4.3/4.4, Phase 1 step 1d).
 *
 * PURPOSE:
 * Turns a cart into a real order: re-validates the cart server-side
 * (never trusts client-submitted totals or line items), creates the
 * `Order` + `OrderItem` rows with status "pending", opens a PayMongo
 * Checkout Session for the server-computed total, and returns the
 * `checkoutUrl` for the client to redirect to. `Order.status` only
 * ever becomes "PAID" via the webhook (step 1e, not built yet) — this
 * route never sets it directly (Rule 30.3 / spec Section 8 checklist).
 *
 * COUPONS (task-54d): the body may carry an optional `couponCode`. It is
 * re-validated here with applyCoupon against the REAL cart — any discount or
 * total sent by the client is never read. One redemption is reserved with a
 * single conditional update (reserveCouponUse), so two buyers cannot both
 * take the last use; it is released if the Order can't be completed.
 *
 * DATA FLOW:
 * 1. Rate limit (Rule 32.1's payment-endpoint tier: 10 / 15 min / IP).
 * 2. Resolve cart identity (buyer session or guest cart_token) and
 *    reload cart line items fresh from the DB + catalog — the same
 *    helper /api/checkout/validate already uses, so the total charged
 *    here is guaranteed to match what the buyer was just shown.
 * 3. Validate email (always) and shipping fields (only when the cart
 *    contains a physical item).
 * 3b. If a couponCode was sent: validate it, work out the discount and
 *    shipping, and reserve one redemption (task-54d).
 * 4. Create Order (pending) + OrderItem rows, snapshotting each item's
 *    name/price/variant at this exact moment (Section 4.4) — a later
 *    catalog price change can never retroactively alter this total.
 *    total = subtotal - discountAmount + shippingFee.
 * 5. Create the PayMongo Checkout Session for the Order's total. If
 *    this fails, the just-created Order/OrderItems are deleted and the
 *    reserved coupon use is released, rather than left behind as an
 *    orphaned "pending" row with no way to ever be paid.
 *
 * The cart is intentionally NOT cleared here. It is only ever cleared
 * once PayMongo confirms the payment (webhook, or the self-heal
 * status endpoint) via lib/orderPayment.ts's markOrderPaid() — see
 * that file's header for why. Clearing it at session-creation time
 * (the previous behavior) meant a buyer whose connection died between
 * clicking "Pay" and PayMongo's redirect lost their cart contents even
 * if the payment never actually completed.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { createCheckoutSession } from "@/services/paymongo";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { loadCartLineItems, SHIPPING_FEE_PHP } from "@/lib/cartPricing";
import { resolveCartIdentity } from "@/lib/cartSession";
import { applyCoupon, buildPayMongoLineItems, releaseCouponUse, reserveCouponUse } from "@/lib/couponPricing";
import { couponMessages } from "@/lib/errorMessages";

// Rule 32.1 payment-endpoint tier: 10 requests / 15 minutes / IP.
const CHECKOUT_MAX_ATTEMPTS = 10;
const CHECKOUT_WINDOW_MINUTES = 15;

/**
 * roundToTwoDecimals
 * Keeps the stored total to the centavo instead of a floating-point tail.
 */
function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

interface CheckoutResponseData {
  orderId: string;
  checkoutUrl: string;
}

export async function POST(request: Request) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "checkout", CHECKOUT_MAX_ATTEMPTS, CHECKOUT_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many checkout attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const submittedEmail = typeof body?.email === "string" ? body.email.trim() : "";
    const shippingName = typeof body?.shippingName === "string" ? body.shippingName.trim() : "";
    const shippingAddress = typeof body?.shippingAddress === "string" ? body.shippingAddress.trim() : "";
    const shippingPhone = typeof body?.shippingPhone === "string" ? body.shippingPhone.trim() : "";
    // Optional promo code. Only the text is read — never a client discount or total.
    const submittedCouponCode = typeof body?.couponCode === "string" ? body.couponCode.trim() : "";

    const { userId, email: sessionEmail, cartToken } = await resolveCartIdentity(request);
    // Signed-in buyers always checkout under their account email —
    // never a value the client could have tampered with in the body.
    const email = userId ? (sessionEmail ?? "") : submittedEmail;

    if (!email) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter an email address to continue." },
        { status: 400 }
      );
    }

    const { items, requiresShipping, subtotal } = await loadCartLineItems(userId, cartToken);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, data: null, message: "Your cart is empty." },
        { status: 400 }
      );
    }

    if (requiresShipping && (!shippingName || !shippingAddress || !shippingPhone)) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your full shipping details to continue." },
        { status: 400 }
      );
    }

    // Step 3b — coupon. Re-validated against the real cart even if the buyer
    // already previewed it (task-54c), so a code that expired or ran out
    // between preview and submit can never fix the price. No Order exists yet,
    // so a rejection here leaves nothing behind.
    let appliedCouponCode: string | null = null;
    let discountAmount = 0;
    let freeShipping = false;

    if (submittedCouponCode) {
      const couponResult = await applyCoupon(submittedCouponCode, items, requiresShipping, subtotal);
      if (!couponResult.ok) {
        return NextResponse.json(
          { success: false, data: null, message: couponMessages[couponResult.reason] },
          { status: 400 }
        );
      }
      appliedCouponCode = couponResult.couponCode;
      discountAmount = couponResult.discountAmount;
      freeShipping = couponResult.freeShipping;

      // PayMongo can't charge a zero-peso item total, so a code that covers
      // the whole item total can't go through PayMongo checkout yet.
      if (roundToTwoDecimals(subtotal - discountAmount) <= 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "This promo code covers your whole order, which can't be paid online yet. Try a different code.",
          },
          { status: 400 }
        );
      }
    }

    // Shipping is waived by a free-shipping code; otherwise unchanged.
    const shippingFee = requiresShipping && !freeShipping ? SHIPPING_FEE_PHP : 0;
    const total = roundToTwoDecimals(subtotal - discountAmount + shippingFee);

    // Reserve one use in a single conditional update (race-safe). From here
    // until the Order is safely saved, every failure path must release it.
    if (appliedCouponCode) {
      const reserved = await reserveCouponUse(appliedCouponCode);
      if (!reserved) {
        return NextResponse.json(
          { success: false, data: null, message: couponMessages.usageLimitReached },
          { status: 400 }
        );
      }
    }

    // Step 4 — create the Order + OrderItems as "pending" before
    // ever calling out to PayMongo (Section 4.4).
    let order: Awaited<ReturnType<typeof prisma.order.create>>;
    try {
      order = await prisma.order.create({
        data: {
          userId,
          guestEmail: userId ? null : email,
          // Captured now so the webhook/self-heal path (server-to-server,
          // no buyer cookies available) knows which guest cart to clear
          // once — and only once — payment is confirmed (Gap A fix).
          cartToken: userId ? null : cartToken,
          status: "pending",
          subtotal,
          couponCode: appliedCouponCode,
          discountAmount,
          shippingFee,
          total,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              nameSnapshot: item.name,
              priceSnapshot: item.unitPrice,
              variant: item.variant,
              quantity: item.quantity,
            })),
          },
        },
      });
    } catch (orderCreateError) {
      // The Order was never saved, so the reserved coupon use goes back.
      if (appliedCouponCode) await releaseCouponUse(appliedCouponCode);
      throw orderCreateError;
    }

    const origin = new URL(request.url).origin;

    // Step 5 — open the PayMongo Checkout Session for this exact
    // Order. Any failure here means the Order can never be paid, so
    // it's deleted rather than left behind as a dead "pending" row.
    let checkoutSessionId: string;
    let checkoutUrl: string;
    try {
      const session = await createCheckoutSession({
        // With a coupon, PayMongo gets one discounted item line so its page
        // shows the exact total charged (see buildPayMongoLineItems).
        items: buildPayMongoLineItems(items, discountAmount, appliedCouponCode),
        shippingFee,
        requiresShipping,
        email,
        shippingName: requiresShipping ? shippingName : undefined,
        shippingPhone: requiresShipping ? shippingPhone : undefined,
        shippingAddress: requiresShipping ? shippingAddress : undefined,
        orderId: order.id,
        successUrl: `${origin}/order-confirmation/${order.id}`,
        cancelUrl: `${origin}/checkout`,
      });
      checkoutSessionId = session.checkoutSessionId;
      checkoutUrl = session.checkoutUrl;
    } catch (paymongoError) {
      console.error("[checkout][POST] PayMongo session creation failed:", (paymongoError as Error).message);
      // OrderItem rows cascade-delete is not defined on this relation,
      // so clear them explicitly before removing the parent Order.
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      // The Order is gone, so its reserved coupon use is released too.
      if (appliedCouponCode) await releaseCouponUse(appliedCouponCode);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't process your order. Please try again." },
        { status: 502 }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymongoOrderId: checkoutSessionId },
    });

    const data: CheckoutResponseData = { orderId: order.id, checkoutUrl };
    return NextResponse.json({ success: true, data, message: "Redirecting you to payment…" });
  } catch (error) {
    console.error("[checkout][POST] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't process your order. Please try again." },
      { status: 500 }
    );
  }
}
