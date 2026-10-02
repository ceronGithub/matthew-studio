/**
 * FILE: lib/couponPricing.ts
 * ROLE: Server-side only — never import this in a "use client" file.
 *
 * PURPOSE:
 * Decides whether a promo code can be used on the current cart and how
 * much it takes off. Used by the validate-coupon route (task-54c) and by
 * the checkout route (task-54d), so the number shown to the buyer and the
 * number actually charged always come from this one function.
 *
 * DATA FLOW:
 * 1. The caller passes the typed code plus the cart lines built on the
 *    server by loadCartLineItems (lib/cartPricing.ts).
 * 2. The code is trimmed and upper-case so "save10 " matches "SAVE10".
 * 3. The Coupon row is loaded and checked: active, not expired, not used up.
 * 4. The discount is worked out from the eligible cart lines only.
 *
 * NEVER reads a client-submitted discount amount — the only inputs are the
 * code and the server-built cart. Never changes usageCount: the redemption
 * is reserved when the order is created (task-54d), not when a code is merely
 * checked.
 */
import { prisma } from "@/services/prisma";
import type { CartLineItem } from "@/lib/cartPricing";
import type { CouponRejectReason } from "@/lib/errorMessages";

export type ApplyCouponResult =
  | {
      ok: true;
      /** Peso amount taken off the items, rounded to 2 decimals. 0 for free shipping. */
      discountAmount: number;
      /** True when the shipping fee should be waived for this order. */
      freeShipping: boolean;
      /** The code in its stored form (trimmed, upper-case). */
      couponCode: string;
    }
  | {
      ok: false;
      /** Key into couponMessages (lib/errorMessages.ts) for the sentence to show. */
      reason: CouponRejectReason;
    };

/**
 * roundToTwoDecimals
 * Money is shown and charged to the centavo, so every discount is rounded
 * here once instead of leaving floating-point tails like 33.330000000000005.
 */
function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * applyCoupon
 * Checks one promo code against the cart and returns the discount, or the
 * reason it can't be used. Rejection reasons are checked in this order:
 * empty -> not found/inactive -> expired -> usage limit -> free-shipping cart
 * -> nothing in the cart matches the coupon's category.
 *
 * @param code             - What the buyer typed in the promo box
 * @param items            - Server-built cart lines (each has category + lineTotal)
 * @param requiresShipping - True when the cart has a t-shirt (a shippable item)
 * @param subtotal         - Server-built cart subtotal before any discount
 */
export async function applyCoupon(
  code: string,
  items: CartLineItem[],
  requiresShipping: boolean,
  subtotal: number
): Promise<ApplyCouponResult> {
  // Trim + upper-case so spacing and casing never cause a missed match (Rule 6).
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { ok: false, reason: "emptyCode" };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });

  // A switched-off coupon looks exactly like one that was never created.
  if (!coupon || !coupon.isActive) return { ok: false, reason: "notFound" };

  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // A null limit means unlimited redemptions.
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reason: "usageLimitReached" };
  }

  // A free-shipping code only makes sense when something is being shipped.
  if (coupon.discountType === "free_shipping" && !requiresShipping) {
    return { ok: false, reason: "freeShippingNotApplicable" };
  }

  // A null scopeCategory covers every line; otherwise only that category.
  const eligibleItems = coupon.scopeCategory
    ? items.filter((item) => item.category === coupon.scopeCategory)
    : items;
  if (eligibleItems.length === 0) return { ok: false, reason: "noMatchingItems" };

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);

  if (coupon.discountType === "free_shipping") {
    return { ok: true, discountAmount: 0, freeShipping: true, couponCode: coupon.code };
  }

  // A zero, negative or non-numeric value would be a bad row — treat it like
  // a code that doesn't exist instead of discounting by a nonsense amount.
  if (!Number.isFinite(coupon.discountValue) || coupon.discountValue <= 0) {
    return { ok: false, reason: "notFound" };
  }

  let rawDiscount: number;
  if (coupon.discountType === "percentage") {
    // Percent is limited to 100 so a typo like 150 can never create a negative total.
    const percent = Math.min(coupon.discountValue, 100);
    rawDiscount = eligibleSubtotal * (percent / 100);
  } else if (coupon.discountType === "fixed") {
    // A fixed amount can't take off more than the eligible items cost.
    rawDiscount = Math.min(coupon.discountValue, eligibleSubtotal);
  } else {
    // Unknown discountType — never guess; reject like an invalid code.
    return { ok: false, reason: "notFound" };
  }

  // The discount can never exceed the whole cart subtotal.
  const discountAmount = roundToTwoDecimals(Math.min(rawDiscount, subtotal));

  return { ok: true, discountAmount, freeShipping: false, couponCode: coupon.code };
}
