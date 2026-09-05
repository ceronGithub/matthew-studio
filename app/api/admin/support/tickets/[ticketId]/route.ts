/**
 * FILE: app/api/admin/support/tickets/[ticketId]/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin().
 *
 * PURPOSE:
 * admin_support_ticket_specification.md Section 4 — full thread for
 * one ticket. Unlike the buyer-side detail route, this is not scoped
 * to a userId (an admin can open any buyer's ticket) — the only
 * ownership check here is the role check itself.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
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
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that support ticket." },
        { status: 404 }
      );
    }

    const { data: buyerData } = await supabaseAdminClient.auth.admin.getUserById(ticket.userId);

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        buyerEmail: buyerData.user?.email ?? null,
      },
      message: "Ticket retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/support/tickets/[ticketId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load that ticket. Please try again." },
      { status: 500 }
    );
  }
}
