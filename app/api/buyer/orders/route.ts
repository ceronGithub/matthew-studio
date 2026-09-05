/**
 * FILE: app/api/buyer/orders/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Order History list (buyer_order_tracking_specification.md Section
 * 3.1/5). Returns the calling buyer's own Order rows, most recent
 * first, paginated 10 per page. Scoped to WHERE userId = the calling
 * buyer's own id (Section 2) — never trusts a client-submitted id.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch that buyer's Order rows (soft-deleted excluded) with a
 *    page/limit window, newest first, including OrderItem rows for
 *    the card summary.
 * 3. Each OrderItem only stores a productId — the real catalog is
 *    the static lib/productsData.ts list (cart_checkout_specification.md
 *    Section 4.4), not the empty Prisma Product table (that one is
 *    reserved for the not-yet-built admin CRUD) — so the thumbnail
 *    category/icon is resolved via getProductById(), never a Prisma
 *    Product join.
 * 4. Return the standard response shape (Rule 28).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { getProductById } from "@/lib/productsData";

const PAGE_SIZE = 10;

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

    const where = { userId, deletedAt: null };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    const data = orders.map((order) => {
      const firstItem = order.items[0];
      const firstProduct = firstItem ? getProductById(firstItem.productId) : undefined;
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: order.id,
        shortId: order.id.slice(-6).toUpperCase(),
        firstItemName: firstItem?.nameSnapshot ?? "Order",
        firstItemCategory: firstProduct?.category ?? null,
        firstItemIconName: firstProduct?.iconName ?? null,
        itemCount,
        total: order.total,
        status: order.status,
        productionStage: order.productionStage,
        createdAt: order.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        orders: data,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Order history retrieved.",
    });
  } catch (error) {
    console.error("[api/buyer/orders] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your orders. Please try again." },
      { status: 500 }
    );
  }
}
