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
 * code and the server-built cart. applyCoupon itself never changes usageCount:
 * the redemption is reserved by reserveCouponUse when the order is created
 * (task-54d), not when a code is merely checked.
 *
 * task-54d also adds three helpers used by the checkout and retry-payment
 * routes: reserveCouponUse / releaseCouponUse (the redemption count) and
 * buildPayMongoLineItems (how the discount reaches PayMongo).
 */
import { prisma } from "@/services/prisma";
import type { CartLineItem } from "@/lib/cartPricing";
import type { CouponRejectReason } from "@/lib/errorMessages";
import type { CheckoutLineItemInput } from "@/services/paymongo";

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

/**
 * reserveCouponUse
 * Takes one redemption of a coupon at order creation. The check and the
 * increment happen in ONE conditional update, so two buyers racing for the
 * last use can never both get it: the database only lets one of them
 * satisfy "usageCount is still below usageLimit". A null usageLimit means
 * unlimited, so those coupons always reserve.
 *
 * Returns true when the use was reserved, false when the coupon was used up
 * (or switched off) in the moment between the preview and this call.
 *
 * @param couponCode - The stored, upper-case code returned by applyCoupon
 */
export async function reserveCouponUse(couponCode: string): Promise<boolean> {
  const reservation = await prisma.coupon.updateMany({
    where: {
      code: couponCode,
      isActive: true,
      // Unlimited coupons, or limited ones that still have room left.
      OR: [{ usageLimit: null }, { usageCount: { lt: prisma.coupon.fields.usageLimit } }],
    },
    data: { usageCount: { increment: 1 } },
  });
  return reservation.count === 1;
}

/**
 * releaseCouponUse
 * Gives back a redemption taken by reserveCouponUse — used when the order
 * can't be completed (the PayMongo session failed and the Order was deleted).
 * Never lets usageCount drop below zero.
 *
 * @param couponCode - The stored, upper-case code that was reserved
 */
export async function releaseCouponUse(couponCode: string): Promise<void> {
  await prisma.coupon.updateMany({
    where: { code: couponCode, usageCount: { gt: 0 } },
    data: { usageCount: { decrement: 1 } },
  });
}

/**
 * buildPayMongoLineItems
 * PayMongo checkout sessions only accept positive line amounts — there is
 * no discount line. So when a coupon took money off, the item lines are
 * folded into ONE line for the discounted items total, and the PayMongo page
 * shows exactly what the buyer will be charged. Orders with no peso discount
 * (including free-shipping codes) keep their normal itemised lines.
 *
 * Used by BOTH the checkout route and the retry-payment route, so a retried
 * payment charges the same discounted total as the first attempt.
 *
 * @param items          - Line items (live cart lines, or the Order's snapshots on retry)
 * @param discountAmount - Peso amount the coupon took off the items (0 if none)
 * @param couponCode     - The code, shown in the line description
 */
export function buildPayMongoLineItems(
  items: CheckoutLineItemInput[],
  discountAmount: number,
  couponCode: string | null
): CheckoutLineItemInput[] {
  if (discountAmount <= 0) return items;

  const itemsSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const discountedItemsTotal = roundToTwoDecimals(itemsSubtotal - discountAmount);
  const codeLabel = couponCode ? ` (promo ${couponCode})` : "";

  return [
    {
      name: `Order items${codeLabel}`,
      unitPrice: discountedItemsTotal,
      variant: `${totalQuantity} item${totalQuantity === 1 ? "" : "s"}, ₱${discountAmount.toFixed(2)} promo discount applied`,
      quantity: 1,
    },
  ];
}
