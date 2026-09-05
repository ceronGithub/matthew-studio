/**
 * FILE: app/api/buyer/notifications/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Notifications list (Task 12, buyer_account_specification.md Section
 * 4.6). GET returns the calling buyer's own Notification rows, most
 * recent first, paginated, plus the current unread count so the
 * BuyerNav bell badge (Task 13) can render without a second request.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch that buyer's Notification rows with a page/limit window,
 *    newest first, alongside a separate unread count query.
 * 3. Return both in one response — list + unreadCount together.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const where = { userId };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.notification.count({ where }),
      // Separate count, not derived from the page above — the badge
      // needs the TOTAL unread count across all pages, not just
      // however many unread rows happen to land on the current page.
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Notifications retrieved.",
    });
  } catch (error) {
    console.error("[api/buyer/notifications GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your notifications. Please try again." },
      { status: 500 }
    );
  }
}
