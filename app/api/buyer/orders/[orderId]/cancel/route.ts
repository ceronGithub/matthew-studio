/**
 * FILE: app/api/buyer/orders/[orderId]/cancel/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Buyer-initiated order cancellation (buyer_order_tracking_specification.md
 * Section 3.2/5). Only allowed while status is "pending" AND
 * productionStage is null or "design_review" (i.e. before printing has
 * started) — once production begins, cancellation must go through
 * support instead. Ownership check mirrors the GET detail route:
 * a nonexistent id and someone else's order return the identical 404.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch the Order by id; 404 if missing or not owned by this buyer.
 * 3. Re-check the cancellable condition server-side (never trust that
 *    the Cancel button was actually hidden client-side) — reject with
 *    a clear, specific message if production has already started,
 *    never a generic 400 (spec Section 5).
 * 4. Update status to "cancelled".
 * 5. Return the standard response shape (Rule 28).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";

const NOT_FOUND_RESPONSE = {
  success: false,
  data: null,
  message: "We couldn't find that order.",
} as const;

export async function PUT(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
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
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
    }

    const isStillCancellable =
      order.status.toLowerCase() === "pending" &&
      (order.productionStage === null || order.productionStage === "design_review");

    if (!isStillCancellable) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "This order can no longer be cancelled — production has already started.",
        },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({
      success: true,
      data: { orderId: updatedOrder.id, status: updatedOrder.status },
      message: "Order cancelled successfully.",
    });
  } catch (error) {
    console.error("[api/buyer/orders/[orderId]/cancel] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't cancel that order. Please try again." },
      { status: 500 }
    );
  }
}
