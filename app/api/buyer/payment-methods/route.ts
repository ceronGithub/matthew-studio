/**
 * FILE: app/api/buyer/payment-methods/[id]/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.3. Removes a saved card:
 * detaches it from PayMongo's side first, then deletes the local
 * SavedPaymentMethod row — keeps PayMongo and this app's DB in sync
 * (services/paymongo.ts's detachPaymongoPaymentMethod header comment).
 * If the removed row was the buyer's default, the next most recently
 * added remaining method (if any) becomes the new default so the
 * buyer is never left with zero defaults while other cards remain.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's user id + email from the session.
 * 2. Fetch the SavedPaymentMethod by id, joined to its
 *    BuyerPaymentProfile; 404 if missing or not owned by this buyer
 *    (ownership check mirrors the order-detail/cancel routes — a
 *    nonexistent id and someone else's card return the identical
 *    404, never revealing which case it was).
 * 3. Detach on PayMongo, then delete the local row.
 * 4. Reassign default if needed.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUser } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";
import { detachPaymongoPaymentMethod } from "@/services/paymongo";

const NOT_FOUND_RESPONSE = {
  success: false,
  data: null,
  message: "We couldn't find that payment method.",
} as const;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const savedMethod = await prisma.savedPaymentMethod.findUnique({
      where: { id },
      include: { buyerPaymentProfile: true },
    });

    if (!savedMethod || savedMethod.buyerPaymentProfile.userId !== user.id) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    // Remove on PayMongo's side first — if this throws, the local row
    // is left untouched so the two sides never drift out of sync.
    await detachPaymongoPaymentMethod(savedMethod.paymongoPaymentMethodId);

    await prisma.savedPaymentMethod.delete({ where: { id: savedMethod.id } });

    // If the removed card was the default, promote the next most
    // recently added remaining card so the buyer isn't left without
    // a default while other saved cards still exist.
    if (savedMethod.isDefault) {
      const nextDefault = await prisma.savedPaymentMethod.findFirst({
        where: { buyerPaymentProfileId: savedMethod.buyerPaymentProfileId },
        orderBy: { createdAt: "desc" },
      });

      if (nextDefault) {
        await prisma.savedPaymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: savedMethod.id },
      message: "Payment method removed.",
    });
  } catch (error) {
    console.error("[api/buyer/payment-methods/[id] DELETE] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't remove that payment method. Please try again." },
      { status: 500 }
    );
  }
}
