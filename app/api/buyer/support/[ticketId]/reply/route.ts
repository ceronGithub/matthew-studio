/**
 * FILE: app/api/buyer/support/[ticketId]/reply/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Adds a buyer reply message to an existing Support Ticket thread
 * (Task 08/10). A reply on a "closed" ticket automatically reopens it
 * to "open" — the buyer replying is itself evidence the issue isn't
 * resolved, so there's no separate "reopen by replying" toggle to
 * remember to check on the frontend.
 *
 * DATA FLOW:
 * 1. Validate CSRF (state-changing action).
 * 2. Resolve the calling buyer's userId; fetch the ticket scoped to
 *    that userId — 404 if missing or not owned (Rule 6).
 * 3. Validate + sanitize the reply body.
 * 4. Create the TicketMessage (senderRole "buyer") and, if the ticket
 *    was "closed", flip status back to "open" — both in one
 *    transaction so the thread and status never drift out of sync.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
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

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      select: { id: true, status: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that support ticket." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const message = String(body.message ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");

    if (message.length < 1) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter a message before sending.", error: "Validation failed" },
        { status: 400 }
      );
    }

    // Create the reply and, if the ticket was closed, reopen it — both
    // together so the thread and status update atomically.
    const [reply] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderRole: "buyer",
          body: message,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: ticket.status === "closed" ? { status: "open" } : {},
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: reply,
        message: "Reply sent.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/buyer/support/[ticketId]/reply POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't send your reply. Please try again." },
      { status: 500 }
    );
  }
}
