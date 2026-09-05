/**
 * FILE: app/api/buyer/support/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Support Tickets list + create (Task 07/08). GET returns the calling
 * buyer's own SupportTicket rows, most recent first, paginated 10 per
 * page — same shape as /api/buyer/orders. POST creates a new ticket
 * with an initial buyer message, scoped to the calling buyer's own
 * userId — never trusts a client-submitted userId.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. GET: fetch that buyer's SupportTicket rows with a page/limit
 *    window, newest first, including the most recent message for a
 *    list-row preview.
 * 3. POST: validate + sanitize subject/body/orderId, create the
 *    ticket and its first TicketMessage (senderRole "buyer") in one
 *    transaction so a ticket never exists without its opening message.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

const PAGE_SIZE = 10;

// Same forbidden-character first line of defense already used on the
// registration form's fullName field and the profile update route
// (Rule 18.1).
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

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

    const [tickets, totalCount] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const data = tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      orderId: ticket.orderId,
      lastMessagePreview: ticket.messages[0]?.body.slice(0, 120) ?? "",
      lastMessageAt: ticket.messages[0]?.createdAt ?? ticket.createdAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tickets: data,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Support tickets retrieved.",
    });
  } catch (error) {
    console.error("[api/buyer/support GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your support tickets. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const subject = String(body.subject ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
    const message = String(body.message ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
    // orderId is optional — links the ticket to one of the buyer's own
    // orders (e.g. opened from Order Tracking's "Contact Support").
    const orderIdRaw = body.orderId ? String(body.orderId).trim().replace(FORBIDDEN_CHARACTERS, "") : null;

    if (subject.length < 3) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter a subject with at least 3 characters.", error: "Validation failed" },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { success: false, data: null, message: "Tell us more — your message should be at least 10 characters.", error: "Validation failed" },
        { status: 400 }
      );
    }

    // If an orderId was supplied, verify it actually belongs to the
    // calling buyer before linking it — never trust a client-submitted
    // orderId at face value (Rule 6 ownership check).
    let orderId: string | null = null;
    if (orderIdRaw) {
      const order = await prisma.order.findFirst({
        where: { id: orderIdRaw, userId },
        select: { id: true },
      });
      orderId = order?.id ?? null;
    }

    // Create the ticket and its opening message together — a ticket
    // must never exist without at least one message in its thread.
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        orderId,
        messages: {
          create: {
            senderRole: "buyer",
            body: message,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: ticket,
        message: "Support ticket submitted. We'll get back to you soon.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/buyer/support POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't submit your ticket. Please try again." },
      { status: 500 }
    );
  }
}
