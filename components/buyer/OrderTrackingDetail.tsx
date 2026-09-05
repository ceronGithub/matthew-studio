/**
 * FILE: components/buyer/OrderTrackingDetail.tsx
 * ROLE: Buyer only — rendered inside app/buyer/orders/[orderId]/page.tsx.
 *
 * PURPOSE:
 * Full order detail with tracking timeline
 * (buyer_order_tracking_specification.md Section 3.2). Renders the
 * digital 3-step timeline or the t-shirt 6-stage stepper depending on
 * what the API already resolved (app/api/buyer/orders/[orderId]/route.ts
 * decides which shape to send — this component just renders whichever
 * array it receives). Handles all three required data states (Rule 25)
 * plus a dedicated "not found" state (Section 2/3.2) for a nonexistent
 * or not-owned order id.
 *
 * Actions: Cancel Order (behind ConfirmationModal per Rule 34.4, only
 * shown while canCancel is true), Reorder (only on Delivered/Cancelled),
 * Contact Support (links into the buyer's own Support Tickets system
 * at /buyer/support with the order id in the query string — Section
 * 4.5's Task 10; previously linked to the public /support contact
 * form, which had no way to associate a reply with this order or
 * this buyer's account).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { PackageSearch, CheckCircle2, Circle, LifeBuoy, RotateCcw, XCircle } from "lucide-react";
import { useBuyerOrderDetail } from "@/lib/hooks/useBuyerOrderDetail";
import { getOrderStatusDisplay } from "@/lib/orderStatus";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function OrderTrackingDetail({ orderId }: { orderId: string }) {
  const { order, isLoading, notFound, error, isCancelling, isReordering, cancelOrder, reorder } =
    useBuyerOrderDetail(orderId);
  const { toasts, showToast, dismissToast } = useToast();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  async function handleCancelConfirm() {
    const result = await cancelOrder();
    setIsCancelModalOpen(false);
    showToast(result.success ? "✓ Order cancelled." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleReorder() {
    const result = await reorder();
    showToast(result.success ? "✓ Items added to your cart." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  if (isLoading) {
    return (
      <div className="orderDetailSkeleton">
        <div className="orderDetailSkeletonBlock skeletonBlock" />
        <div className="orderDetailSkeletonBlock skeletonBlock" />
        <div className="orderDetailSkeletonBlock skeletonBlock" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="orderDetailEmptyState">
        <PackageSearch size={32} />
        <p>We couldn&apos;t find that order.</p>
        <Link href="/buyer/orders" className="orderDetailBackLink">
          Back to orders
        </Link>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="orderDetailEmptyState">
        <PackageSearch size={32} />
        <p>{error ?? "Something went wrong loading this order."}</p>
        <Link href="/buyer/orders" className="orderDetailBackLink">
          Back to orders
        </Link>
      </div>
    );
  }

  const statusDisplay = getOrderStatusDisplay(order.status);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <section className="orderDetailHeader">
        <p className="orderDetailEyebrow">Order #{order.shortId}</p>
        <div className="orderDetailHeaderRow">
          <h1 className="orderDetailTitle">{formatDateTime(order.createdAt)}</h1>
          <span className="orderDetailStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
            {statusDisplay.label}
          </span>
        </div>
      </section>

      <section className="orderDetailTimeline">
        {order.timeline.map((step) => {
          const isDone = Boolean(step.completedAt) && !step.isCurrent;
          return (
            <div key={step.key} className={`orderDetailTimelineStep${step.isCurrent ? " orderDetailTimelineStep--current" : ""}`}>
              {isDone ? <CheckCircle2 size={18} className="orderDetailTimelineIcon orderDetailTimelineIcon--done" /> : <Circle size={18} className="orderDetailTimelineIcon" />}
              <div className="orderDetailTimelineStepBody">
                <p className="orderDetailTimelineStepLabel">{step.label}</p>
                {step.completedAt && <p className="orderDetailTimelineStepTime">{formatDateTime(step.completedAt)}</p>}
              </div>
            </div>
          );
        })}
      </section>

      <section className="orderDetailItems">
        <h2 className="orderDetailSectionTitle">Items</h2>
        <div className="orderDetailItemsList">
          {order.items.map((item, index) => {
            const Icon = item.iconName ? CATEGORY_ICONS[item.iconName as keyof typeof CATEGORY_ICONS] : undefined;
            return (
              <div key={`${item.productId}-${index}`} className="orderDetailItemRow">
                <div className="orderDetailItemIcon">{Icon ? <Icon size={20} /> : <PackageSearch size={20} />}</div>
                <div className="orderDetailItemBody">
                  <p className="orderDetailItemName">{item.name}</p>
                  {item.variant && <p className="orderDetailItemVariant">{item.variant}</p>}
                  <p className="orderDetailItemQuantity">Qty {item.quantity}</p>
                </div>
                <p className="orderDetailItemSubtotal">{formatPeso(item.subtotal)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="orderDetailSummary">
        <h2 className="orderDetailSectionTitle">Payment summary</h2>
        <div className="orderDetailSummaryRow">
          <span>Subtotal</span>
          <span>{formatPeso(order.summary.subtotal)}</span>
        </div>
        {order.summary.shippingFee > 0 && (
          <div className="orderDetailSummaryRow">
            <span>Shipping</span>
            <span>{formatPeso(order.summary.shippingFee)}</span>
          </div>
        )}
        <div className="orderDetailSummaryRow orderDetailSummaryRow--total">
          <span>Total</span>
          <span>{formatPeso(order.summary.total)}</span>
        </div>
        {order.payment.method && (
          <p className="orderDetailPaymentMethod">
            Paid via {order.payment.method} — {order.payment.status}
          </p>
        )}
      </section>

      {order.shipping && (
        <section className="orderDetailShipping">
          <h2 className="orderDetailSectionTitle">Shipping</h2>
          <p className="orderDetailShippingLine">
            {order.shipping.courier && order.shipping.trackingNumber
              ? `${order.shipping.courier} — ${order.shipping.trackingNumber}`
              : "Tracking number not yet assigned."}
          </p>
        </section>
      )}

      <section className="orderDetailActions">
        <Link href={`/buyer/support?orderId=${order.orderId}`} className="orderDetailActionButton orderDetailActionButton--secondary">
          <LifeBuoy size={16} /> Contact Support
        </Link>
        {order.canCancel && (
          <button
            type="button"
            className="orderDetailActionButton orderDetailActionButton--destructive"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={isCancelling}
          >
            <XCircle size={16} /> Cancel Order
          </button>
        )}
        {order.canReorder && (
          <button
            type="button"
            className="orderDetailActionButton orderDetailActionButton--primary"
            onClick={handleReorder}
            disabled={isReordering}
          >
            <RotateCcw size={16} /> {isReordering ? "Adding…" : "Reorder"}
          </button>
        )}
      </section>

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        title="Cancel Order?"
        description={`Are you sure you want to cancel Order #${order.shortId}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        onConfirm={handleCancelConfirm}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </>
  );
}
