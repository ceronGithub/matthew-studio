/**
 * FILE: app/api/admin/support/tickets/[ticketId]/status/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin().
 *
 * PURPOSE:
 * admin_support_ticket_specification.md Section 2/4 / Task 16. Lets
 * an admin manually close a ticket that doesn't need a reply (e.g.
 * already resolved another way). Per the spec, only the "closed"
 * transition is defined for now — no other manual status change is
 * exposed here. The UI side (Task 18) gates this behind Rule 34.4's
 * confirmation modal since it's a state change the buyer will see
 * reflected on their own ticket.
 *
 * DATA FLOW:
 * 1. Validate CSRF (state-changing action, Rule 32.2).
 * 2. Resolve the calling account via getSessionAdmin() — 401 if not
 *    an admin/superAdmin session.
 * 3. Validate the requested status is exactly "closed" — reject
 *    anything else rather than silently accepting an unsupported
 *    transition.
 * 4. Fetch the ticket by id — 404 if missing.
 * 5. Update status to "closed".
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";

export async function PUT(
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

    const body = await request.json();
    const requestedStatus = String(body.status ?? "");

    // Only "closed" is a supported manual transition for now — reject
    // anything else instead of silently accepting an undefined status.
    if (requestedStatus !== "closed") {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Only closing a ticket is supported right now.",
          error: "Unsupported status value",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that support ticket." },
        { status: 404 }
      );
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "closed" },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Ticket closed.",
    });
  } catch (error) {
    console.error("[api/admin/support/tickets/[ticketId]/status PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update that ticket. Please try again." },
      { status: 500 }
    );
  }
}
