/**
 * FILE: app/api/admin/orders/[orderId]/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.3.2 — Order Details page.
 * Returns everything task-81's UI needs in one call: header, buyer
 * info, items (with category via a Product join, since OrderItem
 * only snapshots name/price/variant), payment info, and a timeline
 * derived from statusHistory (falls back to createdAt-only when the
 * order predates task-77's status-update route, per that field's
 * schema comment — "Null until task-77 starts writing to it").
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Fetch the Order (soft-delete excluded per Rule 6) + its
 *    OrderItem rows; 404 if not found or already soft-deleted.
 * 3. Join each item's Product for category/categoryLabel (best
 *    effort — a since-deleted Product still leaves the OrderItem
 *    snapshot fields usable, category just falls back to null).
 * 4. Resolve buyer info: guestEmail is already on the row for guest
 *    checkouts; registered buyers (userId set) get a Supabase Auth
 *    lookup for email + account created date. Name/phone are not
 *    collected anywhere in this app's checkout flow (see
 *    retry-payment route's own "KNOWN GAP" comment) — surfaced here
 *    as null rather than invented.
 * 5. Build the timeline from statusHistory (Json array) when present;
 *    otherwise a single "Created" entry from Order.createdAt.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

interface StatusHistoryEntry {
  status: string;
  adminId: string;
  note?: string;
  createdAt: string;
}

interface InternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

export async function GET(
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

    const order = await prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
        { status: 404 }
      );
    }

    // Join each item's Product for category — OrderItem only
    // snapshots name/price/variant, never category (Rule 6 pattern:
    // best-effort join, never blocks the response if a Product was
    // since deleted).
    const productIds = Array.from(new Set(order.items.map((item) => item.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true, categoryLabel: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    const items = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      category: productById.get(item.productId)?.category ?? null,
      categoryLabel: productById.get(item.productId)?.categoryLabel ?? null,
      price: item.priceSnapshot,
      variant: item.variant,
      quantity: item.quantity,
      subtotal: item.priceSnapshot * item.quantity,
    }));

    const hasTshirtItem = items.some((item) => item.category === "tshirts");

    // Buyer info: guest orders already carry guestEmail; registered
    // buyers need a Supabase Auth lookup for email + join date. This
    // app has no local User table — same pattern as
    // app/api/orders/[orderId]/retry-payment/route.ts. Name/phone are
    // not collected in checkout (documented gap in that route too).
    let buyerEmail: string | null = order.guestEmail;
    let buyerAccountCreatedAt: string | null = null;
    if (order.userId) {
      const { data } = await supabaseAdminClient.auth.admin.getUserById(order.userId);
      buyerEmail = data.user?.email ?? null;
      buyerAccountCreatedAt = data.user?.created_at ?? null;
    }

    // Timeline: derived from statusHistory when task-77 has started
    // writing to it; otherwise a single "Created" entry so the UI
    // never shows an empty timeline for orders predating that route.
    const statusHistory = (order.statusHistory as StatusHistoryEntry[] | null) ?? [];
    const timeline =
      statusHistory.length > 0
        ? statusHistory.map((entry) => ({
            status: entry.status,
            note: entry.note ?? null,
            adminId: entry.adminId,
            at: entry.createdAt,
          }))
        : [{ status: "Created", note: null, adminId: null, at: order.createdAt.toISOString() }];

    const internalNotes = (order.internalNotes as InternalNoteEntry[] | null) ?? [];

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
        buyer: {
          userId: order.userId,
          email: buyerEmail,
          isGuest: !order.userId,
          accountCreatedAt: buyerAccountCreatedAt,
        },
        items,
        hasTshirtItem,
        totals: {
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          total: order.total,
        },
        payment: {
          method: order.paymongoPaymentId ? "PayMongo" : null,
          status: order.paymentStatus,
          transactionId: order.paymongoPaymentId,
          paidAt: order.paidAt,
        },
        timeline,
        internalNotes,
        refund: {
          refundReason: order.refundReason,
          refundedAt: order.refundedAt,
        },
        shipping: {
          courier: order.courier,
          trackingNumber: order.trackingNumber,
          address: order.shippingAddress,
        },
        productionStage: order.productionStage,
      },
      message: "Order details retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/orders/[orderId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load this order. Please try again." },
      { status: 500 }
    );
  }
}
