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
 * DATA FLOW:
 * 1. Rate limit (Rule 32.1's payment-endpoint tier: 10 / 15 min / IP).
 * 2. Resolve cart identity (buyer session or guest cart_token) and
 *    reload cart line items fresh from the DB + catalog — the same
 *    helper /api/checkout/validate already uses, so the total charged
 *    here is guaranteed to match what the buyer was just shown.
 * 3. Validate email (always) and shipping fields (only when the cart
 *    contains a physical item).
 * 4. Create Order (pending) + OrderItem rows, snapshotting each item's
 *    name/price/variant at this exact moment (Section 4.4) — a later
 *    catalog price change can never retroactively alter this total.
 * 5. Create the PayMongo Checkout Session for the Order's total. If
 *    this fails, the just-created Order/OrderItems are deleted rather
 *    than left behind as an orphaned "pending" row with no way to
 *    ever be paid.
 * 6. Clear the buyer's/guest's cart — once a pending Order exists for
 *    these items, showing them again in the cart drawer would let the
 *    buyer accidentally order the same things twice.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { createCheckoutSession } from "@/services/paymongo";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { loadCartLineItems, SHIPPING_FEE_PHP } from "@/lib/cartPricing";
import { resolveCartIdentity } from "@/lib/cartSession";

// Rule 32.1 payment-endpoint tier: 10 requests / 15 minutes / IP.
const CHECKOUT_MAX_ATTEMPTS = 10;
const CHECKOUT_WINDOW_MINUTES = 15;

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

    const shippingFee = requiresShipping ? SHIPPING_FEE_PHP : 0;
    const total = subtotal + shippingFee;

    // Step 4 — create the Order + OrderItems as "pending" before
    // ever calling out to PayMongo (Section 4.4).
    const order = await prisma.order.create({
      data: {
        userId,
        guestEmail: userId ? null : email,
        status: "pending",
        subtotal,
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

    const origin = new URL(request.url).origin;

    // Step 5 — open the PayMongo Checkout Session for this exact
    // Order. Any failure here means the Order can never be paid, so
    // it's deleted rather than left behind as a dead "pending" row.
    let checkoutSessionId: string;
    let checkoutUrl: string;
    try {
      const session = await createCheckoutSession({
        items,
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
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't process your order. Please try again." },
        { status: 502 }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymongoOrderId: checkoutSessionId },
    });

    // Step 6 — clear the cart now that a pending Order owns these
    // items; never before the Order was successfully created above.
    if (userId) {
      await prisma.cartItem.deleteMany({ where: { userId } });
    } else if (cartToken) {
      await prisma.cartItem.deleteMany({ where: { cartToken } });
    }

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
