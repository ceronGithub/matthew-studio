/**
 * FILE: app/api/buyer/payment-methods/[id]/default/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.3. Sets one saved card as
 * the buyer's default and unsets every other saved card belonging to
 * the same BuyerPaymentProfile, in a single transaction so two saved
 * cards can never both be marked default even under a concurrent
 * request (Rule 6's optimistic-consistency intent, applied here via
 * an atomic transaction rather than a version field since both writes
 * are on rows this buyer already owns).
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's user id from the session.
 * 2. Fetch the target SavedPaymentMethod by id, joined to its
 *    BuyerPaymentProfile; 404 if missing or not owned by this buyer.
 * 3. If already the default, return early (no-op success — never an
 *    error for re-confirming an already-true state).
 * 4. Otherwise, in one transaction: unset every other row for this
 *    buyerPaymentProfileId, then set this row's isDefault to true.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUser } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

const NOT_FOUND_RESPONSE = {
  success: false,
  data: null,
  message: "We couldn't find that payment method.",
} as const;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    if (savedMethod.isDefault) {
      return NextResponse.json({
        success: true,
        data: { id: savedMethod.id, isDefault: true },
        message: "This is already your default payment method.",
      });
    }

    await prisma.$transaction([
      prisma.savedPaymentMethod.updateMany({
        where: { buyerPaymentProfileId: savedMethod.buyerPaymentProfileId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.savedPaymentMethod.update({
        where: { id: savedMethod.id },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { id: savedMethod.id, isDefault: true },
      message: "Default payment method updated.",
    });
  } catch (error) {
    console.error("[api/buyer/payment-methods/[id]/default PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update your default payment method. Please try again." },
      { status: 500 }
    );
  }
}
