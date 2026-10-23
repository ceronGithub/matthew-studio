/**
 * FILE: app/api/buyer/orders/[orderId]/refund-request/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * task-55b, additional_platform_gaps_specification.md Section 4.2 (buyer
 * side): a buyer asks for a refund on one of their orders. The request only
 * waits for review — nothing is refunded here; an admin decides in task-55d.
 * The body carries only { reason, note }; the order, the buyer and the amount
 * are all worked out on the server (Rule 6).
 *
 * DATA FLOW (POST):
 * 1. CSRF check, then rate limit (a blocked request is logged, Rule 38.10).
 * 2. Resolve the buyer from the session cookie (401 if none).
 * 3. Validate the body with refundRequestSchema (lib/refundValidation.ts).
 * 4. Load the order; the same 404 whether it is missing or not theirs.
 * 5. Check eligibility (lib/refundEligibility.ts): status, payment, window.
 * 6. One open request per order — app check first, then the unique
 *    pendingOrderId column as the database-level backup.
 * 7. Create the RefundRequest with refundAmount = Order.total, write an
 *    audit entry, and return the standard shape (Rule 28).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { getProductById } from "@/lib/productsData";
import { isValidCsrfRequest } from "@/lib/csrf";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { recordAuditLog } from "@/lib/auditLog";
import { refundMessages } from "@/lib/errorMessages";
import { refundRequestSchema } from "@/lib/refundValidation";
import { getRefundEligibility } from "@/lib/refundEligibility";

const REFUND_REQUEST_MAX_ATTEMPTS = 5;
const REFUND_REQUEST_WINDOW_MINUTES = 15;

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    // Counted before anything else is read so spamming bad requests uses up the budget too.
    const rateLimit = await checkRateLimit(
      getClientIp(request),
      "refund-request",
      REFUND_REQUEST_MAX_ATTEMPTS,
      REFUND_REQUEST_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        actor: null,
        request,
        details: "Refund-request: rate limit exceeded",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = refundRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsedBody.error.issues[0]?.message ?? refundMessages.invalidReason,
          error: JSON.stringify(parsedBody.error.issues),
        },
        { status: 400 }
      );
    }
    const { reason, note } = parsedBody.data;

    const { orderId } = await params;
    const order = await prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: true },
    });

    // Same 404 for "doesn't exist" and "isn't yours" — never leak which case it is.
    if (!order || order.userId !== userId) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that order." },
        { status: 404 }
      );
    }

    // The real catalog lives in lib/productsData.ts, so the category comes from there.
    const hasApparelItem = order.items.some((item: { productId: string }) => getProductById(item.productId)?.category === "tshirts");

    const eligibility = getRefundEligibility({
      status: order.status,
      paidAt: order.paidAt,
      paymongoPaymentId: order.paymongoPaymentId,
      refundedAt: order.refundedAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory,
      hasApparelItem,
    });
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, data: null, message: eligibility.message, error: "not eligible for refund" },
        { status: 400 }
      );
    }

    const alreadyPendingRequest = await prisma.refundRequest.findFirst({
      where: { orderId: order.id, status: "pending" },
      select: { id: true },
    });
    if (alreadyPendingRequest) {
      return NextResponse.json(
        { success: false, data: null, message: refundMessages.alreadyPending, error: "pending request exists" },
        { status: 409 }
      );
    }

    let refundRequest;
    try {
      refundRequest = await prisma.refundRequest.create({
        data: {
          orderId: order.id,
          userId,
          reason,
          note,
          refundAmount: order.total, // always the server's total, never client-submitted
          pendingOrderId: order.id, // unique while pending — blocks a simultaneous second request
        },
      });
    } catch (createError) {
      // Database unique constraint (P2002) — another request for this order got in
      // between our check above and this insert.
      if ((createError as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, data: null, message: refundMessages.alreadyPending, error: "pending request exists" },
          { status: 409 }
        );
      }
      throw createError;
    }

    await recordAuditLog({
      entityType: "refundRequest",
      entityId: refundRequest.id,
      actor: `buyer:${userId}`,
      action: "created",
      note: `Refund requested for order ${order.id.slice(-6).toUpperCase()} (${reason}).`,
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: refundRequest.id, status: refundRequest.status, refundAmount: refundRequest.refundAmount },
        message: refundMessages.submitted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/buyer/orders/[orderId]/refund-request POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't submit your refund request. Please try again." },
      { status: 500 }
    );
  }
}
