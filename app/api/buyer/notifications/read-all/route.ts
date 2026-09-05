/**
 * FILE: app/api/buyer/notifications/read-all/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * "Mark all as read" action (Task 12, Section 4.6). Bulk-updates every
 * unread Notification row belonging to the calling buyer in one query
 * — never loops and updates one at a time.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. updateMany scoped to userId + isRead: false.
 * 3. Return the count of rows actually updated, so the UI can show
 *    "no unread notifications" distinctly from "all marked read".
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

export async function PUT(request: Request) {
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

    // Scoped to this buyer's own unread rows only — never a global
    // updateMany across all users.
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
      message:
        result.count > 0
          ? `Marked ${result.count} notification${result.count === 1 ? "" : "s"} as read.`
          : "No unread notifications.",
    });
  } catch (error) {
    console.error("[api/buyer/notifications/read-all PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update your notifications. Please try again." },
      { status: 500 }
    );
  }
}
