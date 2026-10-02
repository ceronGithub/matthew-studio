/**
 * FILE: app/api/checkout/validate-coupon/route.ts
 * ROLE: Public — buyers and guests can both use promo codes, like the rest of checkout.
 *
 * PURPOSE:
 * Previews what a promo code would do to the current cart so the checkout
 * page can show the new total. This route only answers "what would this
 * code take off right now" — it does NOT create an Order and does NOT change
 * the coupon's usageCount. POST /api/checkout (task-54d) re-validates the
 * code when the order is really created, so a stale preview can never fix the
 * price the buyer is charged.
 *
 * DATA FLOW:
 * 1. CSRF check first (Rule 32.2) — rejects requests that didn't come from this app's pages.
 * 2. Rate limit (Rule 32.1, payment tier: 10 / 15 min / IP) so codes can't be guessed
 *    by hammering this route. A blocked request is logged as rate_limit_hit (Rule 38.10).
 * 3. The body is validated with zod — only a short text "code" is accepted.
 * 4. The cart is rebuilt on the server from the buyer's account or the guest cart
 *    token. No amount, price or discount from the client is ever read.
 * 5. applyCoupon (lib/couponPricing.ts) decides if the code works and how much it takes off.
 * 6. The new shipping fee and total are worked out here and returned in the Rule 28 shape.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCartLineItems, SHIPPING_FEE_PHP } from "@/lib/cartPricing";
import { resolveCartIdentity } from "@/lib/cartSession";
import { applyCoupon } from "@/lib/couponPricing";
import { isValidCsrfRequest } from "@/lib/csrf";
import { couponMessages } from "@/lib/errorMessages";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

// Rule 32.1 payment-endpoint tier: 10 requests / 15 minutes / IP.
const VALIDATE_COUPON_MAX_ATTEMPTS = 10;
const VALIDATE_COUPON_WINDOW_MINUTES = 15;

// The body must be { code: "some text" }. 64 characters is far longer than any
// real promo code, so oversized input is refused before it reaches the database.
const validateCouponBodySchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export interface ValidateCouponData {
  /** The code in its stored form (trimmed, upper-case). */
  couponCode: string;
  /** Peso amount taken off the items. 0 for a free-shipping code. */
  discountAmount: number;
  /** True when the shipping fee is waived. */
  freeShipping: boolean;
  /** Shipping fee after the coupon — 0 when shipping is free or not needed. */
  shippingFee: number;
  /** New order total: subtotal - discountAmount + shippingFee. */
  total: number;
}

/**
 * roundToTwoDecimals
 * Keeps the returned total to the centavo instead of a floating-point tail.
 */
function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    // Counted before the body is read so spamming bad requests also uses up the budget.
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(
      ipAddress,
      "validate-coupon",
      VALIDATE_COUPON_MAX_ATTEMPTS,
      VALIDATE_COUPON_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        actor: null,
        request,
        details: "Validate-coupon: rate limit exceeded",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = validateCouponBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, data: null, message: couponMessages.emptyCode },
        { status: 400 }
      );
    }

    // Identity comes from the session or guest cart token — never from the body.
    const { userId, cartToken } = await resolveCartIdentity(request);
    const { items, requiresShipping, subtotal } = await loadCartLineItems(userId, cartToken);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, data: null, message: "Your cart is empty." },
        { status: 400 }
      );
    }

    const couponResult = await applyCoupon(parsedBody.data.code, items, requiresShipping, subtotal);

    // Invalid, expired, used-up and out-of-scope codes always get a clear
    // sentence from couponMessages — never a silent success.
    if (!couponResult.ok) {
      return NextResponse.json(
        { success: false, data: null, message: couponMessages[couponResult.reason] },
        { status: 400 }
      );
    }

    // Shipping is only charged when the cart has a t-shirt, and a free-shipping code waives it.
    const shippingFee = requiresShipping && !couponResult.freeShipping ? SHIPPING_FEE_PHP : 0;
    const total = roundToTwoDecimals(subtotal - couponResult.discountAmount + shippingFee);

    const data: ValidateCouponData = {
      couponCode: couponResult.couponCode,
      discountAmount: couponResult.discountAmount,
      freeShipping: couponResult.freeShipping,
      shippingFee,
      total,
    };

    const message = couponResult.freeShipping
      ? "Promo code applied — shipping is free."
      : `Promo code applied — ₱${couponResult.discountAmount.toFixed(2)} off.`;

    return NextResponse.json({ success: true, data, message });
  } catch (error) {
    console.error("[checkout/validate-coupon][POST] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't check that promo code. Please try again in a moment." },
      { status: 500 }
    );
  }
}
