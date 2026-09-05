/**
 * FILE: app/api/buyer/support/[ticketId]/reopen/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Reopens a closed Support Ticket without requiring a new message —
 * the standalone "Reopen" action on the ticket detail page (Task 10),
 * separate from replying (which auto-reopens as a side effect, see
 * ./reply/route.ts). Only meaningful on a "closed" ticket; a ticket
 * that's already open or answered is left as-is.
 *
 * DATA FLOW:
 * 1. Validate CSRF (state-changing action).
 * 2. Resolve the calling buyer's userId; fetch the ticket scoped to
 *    that userId — 404 if missing or not owned (Rule 6).
 * 3. If already open/answered, return success as a no-op (nothing to
 *    reopen twice — same idempotent pattern as subscription/cancel).
 * 4. Otherwise flip status to "open".
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

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
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that support ticket." },
        { status: 404 }
      );
    }

    if (ticket.status !== "closed") {
      return NextResponse.json({
        success: true,
        data: ticket,
        message: "This ticket is already open.",
      });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "open" },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Ticket reopened.",
    });
  } catch (error) {
    console.error("[api/buyer/support/[ticketId]/reopen POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't reopen your ticket. Please try again." },
      { status: 500 }
    );
  }
}
