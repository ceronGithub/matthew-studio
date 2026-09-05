/**
 * FILE: app/api/admin/support/tickets/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_support_ticket_specification.md Section 4 — ticket inbox
 * list. Unlike the buyer-side GET /api/buyer/support (scoped to one
 * buyer's own tickets), this returns every ticket across every
 * buyer, newest activity first, with an optional status filter.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Fetch a page of SupportTicket rows (+ latest message preview),
 *    optionally filtered by status.
 * 3. Resolve each distinct buyer's email via
 *    supabaseAdminClient.auth.admin.getUserById() — there's no local
 *    User table (auth lives in Supabase), same lookup pattern already
 *    used by app/api/orders/[orderId]/retry-payment/route.ts.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

const PAGE_SIZE = 20;
const VALID_STATUSES = ["open", "answered", "closed"];

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const statusParam = searchParams.get("status");
    const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

    const where = status ? { status } : {};

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

    // Resolve buyer emails for this page's tickets only — never the
    // whole buyer base. Deduplicate userIds so a buyer with multiple
    // tickets on the same page only triggers one lookup.
    const uniqueUserIds = Array.from(new Set(tickets.map((ticket) => ticket.userId)));
    const emailByUserId = new Map<string, string | null>();

    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const { data } = await supabaseAdminClient.auth.admin.getUserById(userId);
        emailByUserId.set(userId, data.user?.email ?? null);
      })
    );

    const data = tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      orderId: ticket.orderId,
      buyerEmail: emailByUserId.get(ticket.userId) ?? null,
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
    console.error("[api/admin/support/tickets GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load support tickets. Please try again." },
      { status: 500 }
    );
  }
}
