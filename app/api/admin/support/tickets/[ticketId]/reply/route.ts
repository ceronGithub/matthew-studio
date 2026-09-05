/**
 * FILE: app/api/admin/support/tickets/[ticketId]/reply/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin(),
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_support_ticket_specification.md Section 4 / Task 16. Adds an
 * admin reply to an existing Support Ticket thread and flips its
 * status to "answered" — the mirror-image of the buyer-side reply
 * route (which flips a closed ticket back to "open"). This is also
 * the third and final Notification event source called for by
 * lib/notifications.ts's "NOT YET WIRED" header comment (Task 14) —
 * that comment is removed below now that this route exists.
 *
 * DATA FLOW:
 * 1. Validate CSRF (state-changing action, Rule 32.2).
 * 2. Resolve the calling account via getSessionAdmin() — 401 if not
 *    an admin/superAdmin session.
 * 3. Fetch the ticket by id only (no userId scoping — an admin can
 *    reply to any buyer's ticket, unlike the buyer-side route).
 * 4. Validate + sanitize the reply body (Rule 18.1).
 * 5. Create the TicketMessage (senderRole "admin") and set status to
 *    "answered" in one transaction, so the thread and status never
 *    drift out of sync (same atomic pattern as the buyer-side route).
 * 6. Fire createNotification() for the ticket's owner — never awaited
 *    into the transaction itself, since a notification failure must
 *    never roll back or fail the reply that already succeeded.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { createNotification } from "@/lib/notifications";

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

    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, subject: true },
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

    // Create the admin reply and flip status to "answered" — both
    // together so the thread and status update atomically.
    const [reply] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderRole: "admin",
          body: message,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "answered" },
      }),
    ]);

    // Notify the buyer that an admin replied. Fire-and-forget in spirit —
    // createNotification() never throws, so this can't fail the response
    // that has already succeeded above.
    await createNotification({
      userId: ticket.userId,
      type: "ticket_reply",
      title: "New reply on your support ticket",
      body: `An admin replied to "${ticket.subject}".`,
      linkHref: `/buyer/support/${ticket.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        data: reply,
        message: "Reply sent.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/admin/support/tickets/[ticketId]/reply POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't send your reply. Please try again." },
      { status: 500 }
    );
  }
}
