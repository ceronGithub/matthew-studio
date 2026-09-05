/**
 * FILE: components/buyer/OrdersList.tsx
 * ROLE: Buyer only — rendered inside app/buyer/orders/page.tsx.
 *
 * PURPOSE:
 * Order History (buyer_order_tracking_specification.md Section 3.1):
 * one card per order, newest first, 10 per page. Each card shows a
 * category-tinted icon (no real product photos exist yet — same
 * placeholder pattern as FeaturedProducts.tsx), item summary, total,
 * status badge, and — for t-shirt orders only — a mini production-
 * stage label. Handles all three required data states (Rule 25):
 * loading skeleton, empty state with a CTA to /shop, and error state
 * with retry. Clicking a card navigates to /buyer/orders/[orderId].
 */
"use client";

import Link from "next/link";
import { PackageSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { useBuyerOrders } from "@/lib/hooks/useBuyerOrders";
import { getOrderStatusDisplay, PRODUCTION_STAGE_LABELS } from "@/lib/orderStatus";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { CATEGORY_ACCENT_COLORS } from "@/lib/categoryAccentColors";

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function OrdersList() {
  const { orders, totalPages, page, isLoading, error, goToPage, refetch } = useBuyerOrders();

  if (isLoading) {
    return (
      <div className="buyerOrdersGrid">
        {[0, 1, 2].map((index) => (
          <div key={index} className="buyerOrderCard buyerOrderCard--skeleton">
            <div className="buyerOrderSkeletonIcon skeletonBlock" />
            <div className="buyerOrderSkeletonLine skeletonBlock" />
            <div className="buyerOrderSkeletonLine skeletonBlock buyerOrderSkeletonLine--short" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="buyerOrdersEmptyState">
        <PackageSearch size={32} />
        <p>{error}</p>
        <button type="button" className="buyerOrdersRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="buyerOrdersEmptyState">
        <PackageSearch size={32} />
        <p>No orders yet.</p>
        <Link href="/shop" className="buyerOrdersRetryButton">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="buyerOrdersGrid">
        {orders.map((order) => {
          const statusDisplay = getOrderStatusDisplay(order.status);
          const Icon = order.firstItemIconName ? CATEGORY_ICONS[order.firstItemIconName as keyof typeof CATEGORY_ICONS] : undefined;
          const accentColor = order.firstItemCategory ? CATEGORY_ACCENT_COLORS[order.firstItemCategory] : undefined;
          const stageLabel = order.productionStage ? PRODUCTION_STAGE_LABELS[order.productionStage] : null;

          return (
            <Link key={order.id} href={`/buyer/orders/${order.id}`} className="buyerOrderCard">
              <div className="buyerOrderIconWrapper" style={accentColor ? { color: accentColor } : undefined}>
                {Icon ? <Icon size={22} /> : <PackageSearch size={22} />}
              </div>

              <div className="buyerOrderCardBody">
                <p className="buyerOrderId">Order #{order.shortId}</p>
                <h2 className="buyerOrderItemSummary">
                  {order.firstItemName}
                  {order.itemCount > 1 ? ` +${order.itemCount - 1} more` : ""}
                </h2>
                <p className="buyerOrderDate">{formatOrderDate(order.createdAt)}</p>
              </div>

              <div className="buyerOrderCardMeta">
                <p className="buyerOrderTotal">{formatPeso(order.total)}</p>
                <span className="buyerOrderStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
                  {statusDisplay.label}
                </span>
                {stageLabel && <span className="buyerOrderStageLabel">{stageLabel}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="buyerOrdersPagination">
          <button
            type="button"
            className="buyerOrdersPageButton"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="buyerOrdersPageLabel">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="buyerOrdersPageButton"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
