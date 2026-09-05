/**
 * FILE: app/api/buyer/subscription/cancel/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.4. Cancels the calling
 * buyer's subscription — never immediately, never deletes the row.
 * Sets cancelAtPeriodEnd so the buyer keeps access through
 * currentPeriodEnd, matching the spec's explicit "cancellation takes
 * effect at the end of the current billing period" rule. Fired from
 * the /buyer/subscription page's ConfirmationModal (Rule 34.4).
 *
 * DATA FLOW:
 * 1. Validate the CSRF token (destructive, state-changing action).
 * 2. Resolve the calling buyer's user id from the session.
 * 3. Fetch the Subscription row; 404 if missing or already
 *    cancelAtPeriodEnd (nothing to cancel twice).
 * 4. Set cancelAtPeriodEnd = true. Status stays "active" until the
 *    period actually ends — a future renewal job (not part of this
 *    task) is what would eventually flip status to "cancelled".
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUser } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
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

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find an active subscription to cancel." },
        { status: 404 }
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json({
        success: true,
        data: subscription,
        message: "Your subscription is already set to cancel at the end of this billing period.",
      });
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    await createNotification({
      userId: user.id,
      type: "billing",
      title: "Subscription set to cancel",
      body: `Your ${updated.planName} plan will remain active through ${updated.currentPeriodEnd.toLocaleDateString()}, then it won't renew.`,
      linkHref: "/buyer/subscription",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Subscription will be cancelled at the end of your billing period.",
    });
  } catch (error) {
    console.error("[api/buyer/subscription/cancel POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't cancel your subscription. Please try again." },
      { status: 500 }
    );
  }
}
