/**
 * FILE: app/api/buyer/support/[ticketId]/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Support Ticket detail (Task 08). Returns one ticket plus its full
 * threaded messages, oldest first, for the ticket detail page (Task
 * 10). Scoped to WHERE userId = the calling buyer's own id — a ticket
 * that exists but belongs to another buyer returns 404, never 403,
 * so its existence isn't leaked to a buyer who doesn't own it.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch the SupportTicket by id + userId together (ownership
 *    check baked into the query, not a separate check after the
 *    fetch — Rule 6).
 * 3. Include all TicketMessage rows, oldest first, for the thread.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that support ticket." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
      message: "Support ticket retrieved.",
    });
  } catch (error) {
    console.error("[api/buyer/support/[ticketId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load that support ticket. Please try again." },
      { status: 500 }
    );
  }
}
