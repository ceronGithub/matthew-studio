/**
 * FILE: app/api/admin/refund-requests/[requestId]/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin() since
 * /api/admin/* is not in middleware.ts's matcher. Needs the
 * "manage-orders" permission and a valid CSRF token.
 *
 * PURPOSE:
 * task-55d, additional_platform_gaps_specification.md Section 4.2 (admin
 * side): an admin approves or denies one pending refund request.
 *   - deny    needs a note (the buyer sees it); changes only the request.
 *   - approve may carry a note; asks PayMongo for the refund FIRST and
 *     only if PayMongo accepts does it change anything in our database.
 *
 * DATA FLOW (PATCH):
 * 1. CSRF (403), session (401), permission (403).
 * 2. Validate { decision, note } — note is required for deny, max 500 chars.
 * 3. Load the request + order. 404 if missing, 409 if not pending anymore.
 * 4a. Deny: mark the request denied and free pendingOrderId.
 * 4b. Approve: check the order has a PayMongo payment id and is not already
 *     refunded, call PayMongo, then in ONE transaction mark the request
 *     approved (storing paymongoRefundId, freeing pendingOrderId) and set
 *     Order.status = "Refunded" + refundedAt + refundReason + history.
 *     A PayMongo failure changes nothing and the request stays pending.
 * 5. Tell the buyer (createNotification), write the audit entry
 *    (recordAuditLog) and the security log (admin_action).
 *
 * KNOWN LIMIT: two admins approving the same request at the same instant
 * could both reach the PayMongo call. The second PayMongo refund for the
 * same payment is expected to be rejected by PayMongo, and the transaction
 * below only lets one of them save. Logged in docs/openFindings.md.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { createPaymongoRefund } from "@/services/paymongo";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";
import { recordAuditLog } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";
import { adminRefundMessages } from "@/lib/errorMessages";

const MAX_NOTE_LENGTH = 500;
const ALREADY_DECIDED_SIGNAL = "REFUND_REQUEST_ALREADY_DECIDED";

// A type alias (not an interface) so it is accepted as Prisma JSON input — interfaces lack the index signature Prisma 7 asks for.
type StatusHistoryEntry = {
  status: string;
  adminId: string;
  note: string | null;
  createdAt: string;
};

/**
 * formatPesos
 * "₱1,250.00" style text for buyer notifications.
 */
function formatPesos(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, data: null, message }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    if (!isValidCsrfRequest(request)) {
      return failure("Invalid request. Please refresh the page and try again.", 403);
    }

    const admin = await getSessionAdmin(request);
    if (!admin) {
      return failure(adminRefundMessages.sessionExpired, 401);
    }

    const isAllowed = await hasAdminPermission(admin, "manage-orders");
    if (!isAllowed) {
      return failure(adminRefundMessages.noPermission, 403);
    }

    const { requestId } = await params;
    const body = await request.json().catch(() => null);
    const decision = body?.decision;
    const reviewerNote: string = typeof body?.note === "string" ? body.note.trim() : "";

    if (decision !== "approve" && decision !== "deny") {
      return failure(adminRefundMessages.invalidDecision, 400);
    }
    if (reviewerNote.length > MAX_NOTE_LENGTH) {
      return failure(adminRefundMessages.noteTooLong, 400);
    }
    if (decision === "deny" && !reviewerNote) {
      return failure(adminRefundMessages.denyNoteRequired, 400);
    }

    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: { order: true },
    });
    if (!refundRequest) {
      return failure(adminRefundMessages.notFound, 404);
    }
    // Checked up front so a second click gets a clear answer without touching PayMongo.
    if (refundRequest.status !== "pending") {
      return failure(adminRefundMessages.alreadyDecided, 409);
    }

    const order = refundRequest.order;
    const reviewedAt = new Date();
    const adminLabel = admin.email ?? admin.id;
    const orderShortId = order.id.slice(-8);

    // ---------- DENY ----------
    if (decision === "deny") {
      const denied = await prisma.refundRequest.updateMany({
        // status: "pending" in the filter means only one decision can ever win.
        where: { id: refundRequest.id, status: "pending" },
        data: {
          status: "denied",
          pendingOrderId: null,
          reviewerNote,
          reviewedByAdminId: admin.id,
          reviewedAt,
        },
      });
      if (denied.count === 0) {
        return failure(adminRefundMessages.alreadyDecided, 409);
      }

      await createNotification({
        userId: refundRequest.userId,
        type: "billing",
        title: "Refund request denied",
        body: `Your refund request for order #${orderShortId} was denied: ${reviewerNote}`,
        linkHref: `/buyer/orders/${order.id}`,
      });
      await recordAuditLog({
        entityType: "RefundRequest",
        entityId: refundRequest.id,
        actor: adminLabel,
        action: "updated",
        changes: { status: { before: "pending", after: "denied" } },
        note: reviewerNote,
      });
      await logSecurityEvent({
        eventType: "admin_action",
        actor: admin.email,
        request,
        details: `Refund request ${refundRequest.id}: deny (order ${order.id})`,
      });

      return NextResponse.json({
        success: true,
        data: { id: refundRequest.id, status: "denied" },
        message: adminRefundMessages.denied,
      });
    }

    // ---------- APPROVE ----------
    if (order.status === "Refunded" || order.refundedAt) {
      return failure(adminRefundMessages.orderAlreadyRefunded, 409);
    }
    if (!order.paymongoPaymentId) {
      return failure(adminRefundMessages.noPaymentOnFile, 409);
    }

    // PayMongo goes first: if it refuses, nothing below runs and the request stays pending.
    let paymongoRefundId: string;
    try {
      const refund = await createPaymongoRefund(
        order.paymongoPaymentId,
        refundRequest.refundAmount,
        `Refund request ${refundRequest.id}: ${refundRequest.reason}`
      );
      paymongoRefundId = refund.refundId;
    } catch (paymongoError) {
      console.error("[api/admin/refund-requests PATCH] PayMongo refund failed:", paymongoError);
      return failure(adminRefundMessages.paymongoFailed, 502);
    }

    const existingHistory = (order.statusHistory as StatusHistoryEntry[] | null) ?? [];
    const historyEntry: StatusHistoryEntry = {
      status: "Refunded",
      adminId: admin.id,
      note: `Refund approved: ${refundRequest.reason}${reviewerNote ? ` — ${reviewerNote}` : ""}`,
      createdAt: reviewedAt.toISOString(),
    };

    try {
      await prisma.$transaction(async (transaction) => {
        const approved = await transaction.refundRequest.updateMany({
          where: { id: refundRequest.id, status: "pending" },
          data: {
            status: "approved",
            pendingOrderId: null,
            reviewerNote: reviewerNote || null,
            reviewedByAdminId: admin.id,
            reviewedAt,
            paymongoRefundId,
          },
        });
        if (approved.count === 0) {
          throw new Error(ALREADY_DECIDED_SIGNAL);
        }

        await transaction.order.update({
          where: { id: order.id },
          data: {
            status: "Refunded",
            refundedAt: reviewedAt,
            refundReason: refundRequest.reason,
            statusHistory: [...existingHistory, historyEntry],
          },
        });
      });
    } catch (saveError) {
      // The money has already left via PayMongo — the refund id is the
      // only thing that lets someone reconcile this by hand, so it goes
      // in the log and back to the admin.
      console.error(
        `[api/admin/refund-requests PATCH] PayMongo refund ${paymongoRefundId} accepted but saving failed:`,
        saveError
      );
      await logSecurityEvent({
        eventType: "admin_action",
        actor: admin.email,
        request,
        details: `Refund request ${refundRequest.id}: PayMongo refund ${paymongoRefundId} accepted but NOT saved`,
      });
      return failure(`${adminRefundMessages.savedAtPaymongoOnly} ${paymongoRefundId}`, 500);
    }

    await createNotification({
      userId: refundRequest.userId,
      type: "billing",
      title: "Refund approved",
      body: `Your refund of ${formatPesos(refundRequest.refundAmount)} for order #${orderShortId} was approved. How soon it reaches you depends on your payment method.`,
      linkHref: `/buyer/orders/${order.id}`,
    });
    await recordAuditLog({
      entityType: "RefundRequest",
      entityId: refundRequest.id,
      actor: adminLabel,
      action: "updated",
      changes: {
        status: { before: "pending", after: "approved" },
        paymongoRefundId: { before: null, after: paymongoRefundId },
      },
      note: reviewerNote || null,
    });
    await logSecurityEvent({
      eventType: "admin_action",
      actor: admin.email,
      request,
      details: `Refund request ${refundRequest.id}: approve (order ${order.id}, refund ${paymongoRefundId})`,
    });

    return NextResponse.json({
      success: true,
      data: { id: refundRequest.id, status: "approved", paymongoRefundId },
      message: adminRefundMessages.approved,
    });
  } catch (error) {
    console.error("[api/admin/refund-requests/[requestId] PATCH] Unexpected error:", error);
    return failure(adminRefundMessages.generic, 500);
  }
}
