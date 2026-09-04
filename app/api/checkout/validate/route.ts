/**
 * FILE: app/api/checkout/validate/route.ts
 * ROLE: Public — read-only(ish) order summary for the checkout page
 * (cart_checkout_specification.md Section 4.2 step 3 / Section 6).
 *
 * PURPOSE:
 * The checkout page never computes totals itself — it calls this on
 * mount and gets back the server's authoritative subtotal, shipping
 * fee, and total, plus whether the buyer is signed in (to pre-fill
 * the contact-info email) and whether the cart needs a shipping
 * address at all. Any cart row whose product was retired since it was
 * added is dropped here (and reported in `removedItemNames`) rather
 * than surfacing as a broken line item — this is the one side effect
 * on an otherwise read-only endpoint, mirroring GET /api/cart's own
 * merge-on-login side effect.
 *
 * DATA FLOW:
 * This does NOT create an Order — that's Phase 1 step 1d, paired with
 * the actual PayMongo Payment Link creation (Section 4.3/4.4), since
 * the spec creates the Order row in the same request that redirects
 * to PayMongo. This route only answers "what would the buyer be
 * charged right now."
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { loadCartLineItems, SHIPPING_FEE_PHP, type CartLineItem } from "@/lib/cartPricing";
import { resolveCartIdentity } from "@/lib/cartSession";

export interface CheckoutSummaryData {
  isLoggedIn: boolean;
  email: string | null;
  items: CartLineItem[];
  removedItemNames: string[];
  requiresShipping: boolean;
  subtotal: number;
  shippingFee: number;
  total: number;
}

export async function GET(request: Request) {
  try {
    const { userId, email, cartToken } = await resolveCartIdentity(request);

    const { items, removedItemNames, requiresShipping, subtotal } = await loadCartLineItems(userId, cartToken);

    // A retired product dropped from the summary is also gone from the
    // buyer's actual cart from this point forward — otherwise it would
    // keep reappearing as "removed" on every future checkout attempt.
    if (removedItemNames.length > 0) {
      const validProductIds = new Set(items.map((item) => item.productId));
      await prisma.cartItem.deleteMany({
        where: userId
          ? { userId, productId: { notIn: Array.from(validProductIds) } }
          : { cartToken, productId: { notIn: Array.from(validProductIds) } },
      });
    }

    const shippingFee = requiresShipping ? SHIPPING_FEE_PHP : 0;
    const total = subtotal + shippingFee;

    const data: CheckoutSummaryData = {
      isLoggedIn: Boolean(userId),
      email,
      items,
      removedItemNames,
      requiresShipping,
      subtotal,
      shippingFee,
      total,
    };

    return NextResponse.json({ success: true, data, message: "Order summary calculated." });
  } catch (error) {
    console.error("[checkout/validate][GET] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Couldn't calculate your order summary. Please try again." },
      { status: 500 }
    );
  }
}
