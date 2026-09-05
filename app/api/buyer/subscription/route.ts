/**
 * FILE: app/api/buyer/subscription/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.4. Returns the calling
 * buyer's current Subscription row (plan name, price, billing cycle,
 * status, next billing date) for the /buyer/subscription page.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's user id from the session.
 * 2. Look up the Subscription row for that userId.
 * 3. No row found is NOT an error — buyers on a one-time-purchase-
 *    only basis have no subscription at all, so `data: null` is a
 *    valid, expected response (Section 4.4's "empty state directing
 *    them to /pricing, not an error").
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
    });

    // No active subscription is a normal state, not a failure —
    // the UI shows an empty state pointing to /pricing for this case.
    return NextResponse.json({
      success: true,
      data: subscription,
      message: subscription ? "Subscription fetched successfully." : "No active subscription.",
    });
  } catch (error) {
    console.error("[api/buyer/subscription GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your subscription. Please try again." },
      { status: 500 }
    );
  }
}
