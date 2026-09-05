/**
 * FILE: app/api/buyer/orders/[orderId]/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Order Tracking Detail (buyer_order_tracking_specification.md Section
 * 3.2/5). Returns full detail for one order — header, tracking
 * timeline, items, payment summary, and shipping info (t-shirt orders
 * only). Server-side ownership check: order.userId must match the
 * calling buyer's session id, else the same 404 shape as a
 * nonexistent order (Section 2) — never a 403, so a buyer can never
 * tell "wrong id" apart from "not yours."
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch the Order by id, including its items.
 * 3. If missing OR userId doesn't match the caller, return 404.
 * 4. Build the tracking timeline: digital-only orders get a fixed
 *    3-step timeline (Order Placed / Payment Confirmed / Delivered);
 *    tshirts-category orders get the 6-stage production stepper
 *    (admin spec Section 3.3.3), reading productionStageHistory for
 *    completed-step timestamps and filtering out any isRevert entries
 *    so a reprint never shows as a step moving backward (spec Section
 *    3.2). productionStageHistory is only ever written by the admin's
 *    production-stage endpoint, which is not built yet (admin spec
 *    Phase 3, still [ ] as of this repo's overviewProject.txt) — so
 *    today this will just render "Design Review" as the current step
 *    with no prior history, which is the correct behavior for an
 *    order that hasn't been advanced yet.
 * 5. Resolve each item's category/icon from lib/productsData.ts (same
 *    pattern as the orders list route) since the real catalog lives
 *    there, not the empty Prisma Product table.
 * 6. Return the standard response shape (Rule 28) — raw PayMongo
 *    transaction IDs are never included (spec Section 3.2).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { getProductById } from "@/lib/productsData";

// Full production pipeline for tshirts-category orders, in order (admin spec Section 3.3.3)
const TSHIRT_STAGES = [
  "design_review",
  "design_approved",
  "printing",
  "quality_check",
  "packed",
  "shipped",
] as const;

const NOT_FOUND_RESPONSE = {
  success: false,
  data: null,
  message: "We couldn't find that order.",
} as const;

interface ProductionStageHistoryEntry {
  productionStage: string;
  note?: string;
  isRevert?: boolean;
  changedAt: string;
}

/**
 * buildTshirtTimeline
 * Renders the 6-stage stepper for a tshirts-category order.
 * Completed steps (before the current stage) get their timestamp from
 * productionStageHistory; reverted entries are filtered out first so
 * the buyer never sees a step move backward (spec Section 3.2).
 */
function buildTshirtTimeline(
  currentStage: string | null,
  history: ProductionStageHistoryEntry[],
  orderPlacedAt: Date
) {
  const forwardHistory = history.filter((entry) => !entry.isRevert);
  const currentIndex = currentStage ? TSHIRT_STAGES.indexOf(currentStage as (typeof TSHIRT_STAGES)[number]) : -1;

  return [
    { key: "order_placed", label: "Order Placed", completedAt: orderPlacedAt.toISOString() },
    ...TSHIRT_STAGES.map((stage, index) => {
      const entry = forwardHistory.find((h) => h.productionStage === stage);
      const isCompleted = currentIndex >= 0 && index < currentIndex;
      const isCurrent = index === currentIndex;
      return {
        key: stage,
        label: stage
          .split("_")
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(" "),
        completedAt: isCompleted || isCurrent ? entry?.changedAt ?? null : null,
        isCurrent,
      };
    }),
    { key: "delivered", label: "Delivered", completedAt: null, isCurrent: false },
  ];
}

/**
 * buildDigitalTimeline
 * Fixed 3-step timeline for digital-only orders (spec Section 3.2) —
 * near-instant in practice, but shown for consistency and receipt
 * purposes.
 */
function buildDigitalTimeline(order: { createdAt: Date; paidAt: Date | null; status: string }) {
  return [
    { key: "order_placed", label: "Order Placed", completedAt: order.createdAt.toISOString() },
    { key: "payment_confirmed", label: "Payment Confirmed", completedAt: order.paidAt?.toISOString() ?? null },
    {
      key: "delivered",
      label: "Delivered",
      completedAt: order.status.toLowerCase() === "delivered" ? order.paidAt?.toISOString() ?? null : null,
    },
  ];
}

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const userId = await getSessionUserId(request);

    if (!userId) {
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

    // Same 404 for "doesn't exist" and "isn't yours" — never leak which case it is
    if (!order || order.userId !== userId) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const items = order.items.map((item) => {
      const product = getProductById(item.productId);
      return {
        productId: item.productId,
        name: item.nameSnapshot,
        category: product?.category ?? null,
        iconName: product?.iconName ?? null,
        price: item.priceSnapshot,
        variant: item.variant,
        quantity: item.quantity,
        subtotal: item.priceSnapshot * item.quantity,
      };
    });

    const hasTshirtItem = items.some((item) => item.category === "tshirts");

    const history = Array.isArray(order.productionStageHistory)
      ? (order.productionStageHistory as unknown as ProductionStageHistoryEntry[])
      : [];

    const timeline = hasTshirtItem
      ? buildTshirtTimeline(order.productionStage, history, order.createdAt)
      : buildDigitalTimeline(order);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        shortId: order.id.slice(-6).toUpperCase(),
        status: order.status,
        productionStage: order.productionStage,
        createdAt: order.createdAt,
        timeline,
        items,
        payment: {
          method: order.paymongoOrderId ? "PayMongo" : null,
          status: order.paymentStatus ?? order.status,
        },
        summary: {
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          total: order.total,
        },
        shipping: hasTshirtItem
          ? {
              address: order.shippingAddress ?? null,
              courier: order.courier ?? null,
              trackingNumber: order.trackingNumber ?? null,
            }
          : null,
        canCancel: order.status.toLowerCase() === "pending" && (order.productionStage === null || order.productionStage === "design_review"),
        canReorder: ["delivered", "cancelled"].includes(order.status.toLowerCase()),
      },
      message: "Order detail retrieved.",
    });
  } catch (error) {
    console.error("[api/buyer/orders/[orderId]] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load that order. Please try again." },
      { status: 500 }
    );
  }
}
