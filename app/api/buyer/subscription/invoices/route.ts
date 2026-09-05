/**
 * FILE: app/api/buyer/subscription/invoices/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.4 "Billing history" —
 * lists the calling buyer's past SubscriptionInvoice rows, newest
 * first, for the /buyer/subscription page's download-links list.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's user id from the session.
 * 2. Look up their Subscription row — no subscription means no
 *    invoices, returned as an empty array (not an error).
 * 3. Fetch SubscriptionInvoice rows for that subscriptionId, newest
 *    issuedAt first.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUser } from "@/lib/getSessionUserId";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // No subscription at all → empty billing history, not an error.
    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No billing history.",
      });
    }

    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: invoices,
      message: "Billing history fetched successfully.",
    });
  } catch (error) {
    console.error("[api/buyer/subscription/invoices GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your billing history. Please try again." },
      { status: 500 }
    );
  }
}
