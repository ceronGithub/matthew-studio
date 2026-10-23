/**
 * FILE: app/api/admin/refund-requests/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin() since
 * /api/admin/* is not in middleware.ts's matcher. Also needs the
 * "manage-orders" permission, same as the other order routes.
 *
 * PURPOSE:
 * task-55d, additional_platform_gaps_specification.md Section 4.2 (admin
 * side): the refund requests queue. Read-only — approving or denying
 * happens in [requestId]/route.ts.
 *
 * DATA FLOW (GET):
 * 1. Session check (401), then "manage-orders" permission check (403).
 * 2. Read ?status= (pending | approved | denied | all, default pending)
 *    and ?page=.
 * 3. Load one page of requests with their order, pending oldest-first so
 *    the longest-waiting request is at the top, decided ones newest-first.
 * 4. Look up each buyer's email (only the page's distinct buyers).
 * 5. Return the standard shape (Rule 28).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { adminRefundMessages } from "@/lib/errorMessages";

const PAGE_SIZE = 25;
const VALID_STATUS_FILTERS = ["pending", "approved", "denied", "all"];

/**
 * resolveBuyerEmails
 * Maps each distinct buyer id on the page to an email address.
 * A buyer that can't be found simply gets no entry, so the queue still loads.
 */
async function resolveBuyerEmails(userIds: string[]): Promise<Map<string, string>> {
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await supabaseAdminClient.auth.admin.getUserById(userId);
      if (data.user?.email) emailByUserId.set(userId, data.user.email);
    })
  );
  return emailByUserId;
}

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: adminRefundMessages.sessionExpired },
        { status: 401 }
      );
    }

    const isAllowed = await hasAdminPermission(admin, "manage-orders");
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, data: null, message: adminRefundMessages.noPermission },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? "pending";
    const statusFilter = VALID_STATUS_FILTERS.includes(statusParam) ? statusParam : "pending";
    const requestedPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const where = statusFilter === "all" ? {} : { status: statusFilter };

    const [refundRequests, totalCount] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        include: { order: { select: { id: true, status: true, total: true, paymongoPaymentId: true } } },
        orderBy: { createdAt: statusFilter === "pending" ? "asc" : "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.refundRequest.count({ where }),
    ]);

    const distinctUserIds = [...new Set(refundRequests.map((refundRequest) => refundRequest.userId))];
    const emailByUserId = await resolveBuyerEmails(distinctUserIds);

    const requests = refundRequests.map((refundRequest) => ({
      id: refundRequest.id,
      orderId: refundRequest.orderId,
      orderShortId: refundRequest.orderId.slice(-8).toUpperCase(),
      orderStatus: refundRequest.order.status,
      orderTotal: refundRequest.order.total,
      hasPaymentOnFile: Boolean(refundRequest.order.paymongoPaymentId),
      buyerEmail: emailByUserId.get(refundRequest.userId) ?? null,
      reason: refundRequest.reason,
      note: refundRequest.note,
      refundAmount: refundRequest.refundAmount,
      status: refundRequest.status,
      reviewerNote: refundRequest.reviewerNote,
      reviewedAt: refundRequest.reviewedAt,
      createdAt: refundRequest.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests,
        page,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
      },
      message: "Refund requests loaded.",
    });
  } catch (error) {
    console.error("[api/admin/refund-requests GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: adminRefundMessages.generic },
      { status: 500 }
    );
  }
}
