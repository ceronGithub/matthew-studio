/**
 * FILE: app/api/buyer/notifications/[id]/read/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Marks a single Notification as read (Task 12). Used when the buyer
 * opens/clicks a notification in the bell dropdown or the
 * /buyer/notifications page (Task 13's deep-link click handler).
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Verify the notification exists AND belongs to this buyer (Rule 6
 *    ownership check) — never trust the [id] param alone.
 * 3. Set isRead: true. No-op response (still success) if it was
 *    already read — marking an already-read notification isn't an
 *    error condition.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Ownership check — the notification must belong to the calling
    // buyer, never just any notification id (Rule 6).
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that notification." },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("[api/buyer/notifications/[id]/read PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update that notification. Please try again." },
      { status: 500 }
    );
  }
}
