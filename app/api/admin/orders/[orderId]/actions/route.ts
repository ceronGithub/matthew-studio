/**
 * FILE: app/api/admin/orders/[orderId]/actions/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.3.1 (Row Actions) and
 * 3.3.2 (Actions) — three distinct actions on a single order, grouped
 * into one route (POST with an `action` discriminator) rather than
 * three separate route files. Same precedent as task-30's grouped
 * vault routes, per Rule 49 Step 4's "grouped as one task" note on
 * this line item in docs/taskPlan.md.
 *
 * Actions:
 *   - "update_status" — moves Order.status, appends a statusHistory
 *     entry, notifies the buyer (if registered).
 *   - "refund"        — sets refundReason/refundedAt, flips status to
 *     "Cancelled" (per spec's badge legend: "Cancelled — refunded or
 *     cancelled"), notifies the buyer.
 *   - "add_note"      — appends an internalNotes entry. Never shown to
 *     the buyer, never triggers a notification.
 *
 * All three log a SecurityLog `admin_action` event (Rule 38) and, for
 * status/refund, call createNotification() when the order has a
 * userId — guest orders (guestEmail only) have no account to notify.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { logSecurityEvent } from "@/lib/securityLog";
import { createNotification } from "@/lib/notifications";

const VALID_STATUSES = ["pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

interface StatusHistoryEntry {
  status: string;
  adminId: string;
  note: string | null;
  createdAt: string;
}

interface InternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

async function handleUpdateStatus(
  orderId: string,
  adminId: string,
  body: { status?: string; note?: string }
) {
  const { status, note } = body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { success: false, data: null, message: "Please choose a valid order status." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) {
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
      { status: 404 }
    );
  }

  const existingHistory = (order.statusHistory as StatusHistoryEntry[] | null) ?? [];
  const entry: StatusHistoryEntry = {
    status,
    adminId,
    note: note?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  await prisma.order.update({
    where: { id: orderId },
    data: { status, statusHistory: [...existingHistory, entry] },
  });

  if (order.userId) {
    await createNotification({
      userId: order.userId,
      type: "order_update",
      title: `Order status updated: ${status}`,
      body: `Your order #${order.id.slice(-8)} is now marked as "${status}".`,
      linkHref: `/buyer/orders/${order.id}`,
    });
  }

  return NextResponse.json({
    success: true,
    data: { status, statusHistory: [...existingHistory, entry] },
    message: `Order status updated to "${status}".`,
  });
}

async function handleRefund(
  orderId: string,
  adminId: string,
  body: { refundReason?: string }
) {
  const refundReason = body.refundReason?.trim();
  if (!refundReason) {
    return NextResponse.json(
      { success: false, data: null, message: "Please provide a reason for this refund." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) {
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
      { status: 404 }
    );
  }

  const refundedAt = new Date();
  const existingHistory = (order.statusHistory as StatusHistoryEntry[] | null) ?? [];
  const entry: StatusHistoryEntry = {
    status: "Cancelled",
    adminId,
    note: `Refunded: ${refundReason}`,
    createdAt: refundedAt.toISOString(),
  };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "Cancelled",
      refundReason,
      refundedAt,
      statusHistory: [...existingHistory, entry],
    },
  });

  if (order.userId) {
    await createNotification({
      userId: order.userId,
      type: "billing",
      title: "Refund issued",
      body: `Your order #${order.id.slice(-8)} has been refunded: ${refundReason}`,
      linkHref: `/buyer/orders/${order.id}`,
    });
  }

  return NextResponse.json({
    success: true,
    data: { status: "Cancelled", refundReason, refundedAt },
    message: "Refund recorded and the buyer has been notified.",
  });
}

async function handleAddNote(orderId: string, adminId: string, body: { note?: string }) {
  const note = body.note?.trim();
  if (!note) {
    return NextResponse.json(
      { success: false, data: null, message: "Please enter a note before saving." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) {
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
      { status: 404 }
    );
  }

  const existingNotes = (order.internalNotes as InternalNoteEntry[] | null) ?? [];
  const entry: InternalNoteEntry = { note, adminId, createdAt: new Date().toISOString() };

  await prisma.order.update({
    where: { id: orderId },
    data: { internalNotes: [...existingNotes, entry] },
  });

  return NextResponse.json({
    success: true,
    data: { internalNotes: [...existingNotes, entry] },
    message: "Note added.",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await request.json();
    const action = body?.action;

    let result: NextResponse;
    switch (action) {
      case "update_status":
        result = await handleUpdateStatus(orderId, admin.id, body);
        break;
      case "refund":
        result = await handleRefund(orderId, admin.id, body);
        break;
      case "add_note":
        result = await handleAddNote(orderId, admin.id, body);
        break;
      default:
        return NextResponse.json(
          { success: false, data: null, message: "Unknown action requested." },
          { status: 400 }
        );
    }

    // Log the action regardless of outcome shape — only after the
    // handler ran, so we know it at least reached the DB layer.
    // Skipped for 400s (validation failures never touched the order).
    if (result.status < 400) {
      await logSecurityEvent({
        eventType: "admin_action",
        actor: admin.email,
        request,
        details: `Order ${orderId}: ${action}`,
      });
    }

    return result;
  } catch (error) {
    console.error("[api/admin/orders/[orderId]/actions POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't complete this action. Please try again." },
      { status: 500 }
    );
  }
}
