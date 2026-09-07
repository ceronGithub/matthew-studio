/**
 * FILE: components/admin/AdminOrderDetail.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/orders/[orderId]/page.tsx.
 *
 * PURPOSE:
 * Order Details page (task-81, admin_account_specification.md
 * Section 3.3.2): header, buyer info, items table, payment info,
 * status timeline, internal notes, and the three task-77 actions
 * (update status, refund, add note) plus task-78's send-email panel.
 * Handles all three required data states (Rule 25) plus a dedicated
 * "not found" state, same pattern as OrderTrackingDetail.tsx.
 *
 * Update Status and Refund both go behind the shared ConfirmationModal
 * (Rule 34.4) — same precedent as AdminOrdersList.tsx's bulk status
 * change, since both notify the buyer and/or move money. Add Note and
 * Send Email are non-destructive and submit directly (Rule 34.3).
 *
 * T-shirt production tracker (task-82) is NOT built here — this page
 * only shows the current productionStage as a read-only label when
 * hasTshirtItem is true. The interactive stepper is its own
 * micro-task per Rule 49 Step 4, embedded into this page later.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PackageSearch,
  Mail,
  StickyNote,
  Truck,
  User,
  CreditCard,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAdminOrderDetail } from "@/lib/hooks/useAdminOrderDetail";
import { getOrderStatusDisplay, PRODUCTION_STAGE_LABELS } from "@/lib/orderStatus";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const STATUS_OPTIONS = ["pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const EMAIL_PRESETS = [
  { value: "shipped_tracking", label: "Shipped / Tracking" },
  { value: "order_confirmed", label: "Order Confirmed" },
  { value: "general_update", label: "General Update" },
  { value: "custom", label: "Custom" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrderDetail({ orderId }: { orderId: string }) {
  const {
    order,
    isLoading,
    notFound,
    error,
    isUpdatingStatus,
    isRefunding,
    isAddingNote,
    isSendingEmail,
    updateStatus,
    refund,
    addNote,
    sendBuyerEmail,
  } = useAdminOrderDetail(orderId);

  const { toasts, showToast, dismissToast } = useToast();

  const [statusChoice, setStatusChoice] = useState(STATUS_OPTIONS[0]);
  const [statusNote, setStatusNote] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [refundReason, setRefundReason] = useState("");
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");

  const [emailPreset, setEmailPreset] = useState(EMAIL_PRESETS[0].value);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  async function handleStatusConfirm() {
    const result = await updateStatus(statusChoice, statusNote);
    setIsStatusModalOpen(false);
    if (result.success) {
      setStatusNote("");
      showToast(`✓ ${result.message}`, "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleRefundConfirm() {
    const result = await refund(refundReason);
    setIsRefundModalOpen(false);
    if (result.success) {
      setRefundReason("");
      showToast("✓ Refund recorded and the buyer has been notified.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleAddNote() {
    if (!noteDraft.trim()) return;
    const result = await addNote(noteDraft);
    if (result.success) {
      setNoteDraft("");
      showToast("✓ Note added.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast("✕ Please fill in both a subject and a message.", "error");
      return;
    }
    const result = await sendBuyerEmail(emailPreset, emailSubject, emailBody);
    if (result.success) {
      setEmailSubject("");
      setEmailBody("");
      showToast("✓ Email sent to the buyer.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  if (isLoading) {
    return (
      <div className="adminOrderDetailSkeleton">
        <div className="adminOrderDetailSkeletonBlock skeletonBlock" />
        <div className="adminOrderDetailSkeletonBlock skeletonBlock" />
        <div className="adminOrderDetailSkeletonBlock skeletonBlock" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="adminOrderDetailEmptyState">
        <PackageSearch size={32} />
        <p>We couldn&apos;t find that order. It may have been moved or deleted.</p>
        <Link href="/admin/orders" className="adminOrderDetailBackLink">
          Back to orders
        </Link>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="adminOrderDetailEmptyState">
        <PackageSearch size={32} />
        <p>{error ?? "Something went wrong loading this order."}</p>
        <Link href="/admin/orders" className="adminOrderDetailBackLink">
          Back to orders
        </Link>
      </div>
    );
  }

  const statusDisplay = getOrderStatusDisplay(order.order.status);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminOrderDetailTopRow">
        <Link href="/admin/orders" className="adminOrderDetailBackLink">
          <ArrowLeft size={16} /> Back to orders
        </Link>
      </div>

      <div className="adminOrderDetailHeaderRow">
        <div>
          <p className="adminOrderDetailEyebrow">Order</p>
          <h1 className="adminOrderDetailTitle">#{order.order.id.slice(-8).toUpperCase()}</h1>
          <p className="adminOrderDetailMeta">Placed {formatDateTime(order.order.createdAt)}</p>
        </div>
        <span className="adminOrderDetailStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
          {statusDisplay.label}
        </span>
      </div>

      {order.hasTshirtItem && order.productionStage && (
        <p className="adminOrderDetailProductionNote">
          T-shirt production stage: {PRODUCTION_STAGE_LABELS[order.productionStage] ?? order.productionStage}
        </p>
      )}

      <div className="adminOrderDetailGrid">
        <section className="adminOrderDetailCard">
          <h2 className="adminOrderDetailSectionTitle">
            <User size={16} /> Buyer
          </h2>
          <p className="adminOrderDetailLine">{order.buyer.email ?? "No email on file"}</p>
          <p className="adminOrderDetailLineMuted">
            {order.buyer.isGuest ? "Guest checkout" : "Registered buyer"}
            {order.buyer.accountCreatedAt ? ` · Joined ${formatDateTime(order.buyer.accountCreatedAt)}` : ""}
          </p>
        </section>

        <section className="adminOrderDetailCard">
          <h2 className="adminOrderDetailSectionTitle">
            <CreditCard size={16} /> Payment
          </h2>
          <p className="adminOrderDetailLine">{order.payment.method ?? "Not yet paid"}</p>
          <p className="adminOrderDetailLineMuted">
            {order.payment.status ?? "—"}
            {order.payment.transactionId ? ` · ${order.payment.transactionId}` : ""}
          </p>
          <p className="adminOrderDetailLineMuted">Paid {formatDateTime(order.payment.paidAt)}</p>
        </section>

        <section className="adminOrderDetailCard">
          <h2 className="adminOrderDetailSectionTitle">
            <Truck size={16} /> Shipping
          </h2>
          <p className="adminOrderDetailLine">{order.shipping.courier ?? "No courier assigned"}</p>
          <p className="adminOrderDetailLineMuted">Tracking: {order.shipping.trackingNumber ?? "—"}</p>
        </section>
      </div>

      <section className="adminOrderDetailItemsSection">
        <h2 className="adminOrderDetailSectionTitle">Items</h2>
        <ul className="adminOrderDetailItemsList">
          {order.items.map((item) => (
            <li key={item.id} className="adminOrderDetailItemRow">
              <div className="adminOrderDetailItemBody">
                <p className="adminOrderDetailItemName">{item.name}</p>
                <p className="adminOrderDetailItemMeta">
                  {item.categoryLabel ?? "Uncategorized"}
                  {item.variant ? ` · ${item.variant}` : ""} · Qty {item.quantity}
                </p>
              </div>
              <p className="adminOrderDetailItemSubtotal">{formatPeso(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <div className="adminOrderDetailSummary">
          <div className="adminOrderDetailSummaryRow">
            <span>Subtotal</span>
            <span>{formatPeso(order.totals.subtotal)}</span>
          </div>
          <div className="adminOrderDetailSummaryRow">
            <span>Shipping</span>
            <span>{formatPeso(order.totals.shippingFee)}</span>
          </div>
          <div className="adminOrderDetailSummaryRow adminOrderDetailSummaryRow--total">
            <span>Total</span>
            <span>{formatPeso(order.totals.total)}</span>
          </div>
        </div>

        {order.refund.refundReason && (
          <p className="adminOrderDetailRefundNote">
            Refunded {formatDateTime(order.refund.refundedAt)}: {order.refund.refundReason}
          </p>
        )}
      </section>

      <section className="adminOrderDetailTimelineSection">
        <h2 className="adminOrderDetailSectionTitle">Timeline</h2>
        <div className="adminOrderDetailTimeline">
          {order.timeline.map((entry, index) => {
            const isLast = index === order.timeline.length - 1;
            return (
              <div key={`${entry.status}-${entry.at}`} className="adminOrderDetailTimelineStep">
                {isLast ? (
                  <CheckCircle2 size={16} className="adminOrderDetailTimelineIcon adminOrderDetailTimelineIcon--done" />
                ) : (
                  <Circle size={16} className="adminOrderDetailTimelineIcon" />
                )}
                <div>
                  <p className="adminOrderDetailTimelineLabel">{entry.status}</p>
                  {entry.note && <p className="adminOrderDetailTimelineNote">{entry.note}</p>}
                  <p className="adminOrderDetailTimelineTime">{formatDateTime(entry.at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="adminOrderDetailActionsSection">
        <h2 className="adminOrderDetailSectionTitle">Update status</h2>
        <div className="adminOrderDetailActionRow">
          <select
            className="adminOrderDetailSelect"
            value={statusChoice}
            onChange={(e) => setStatusChoice(e.target.value)}
            aria-label="New status"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="adminOrderDetailInput"
            placeholder="Optional note (visible to admins only)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
          <button
            type="button"
            className="adminOrderDetailButton adminOrderDetailButton--primary"
            onClick={() => setIsStatusModalOpen(true)}
            disabled={isUpdatingStatus}
          >
            Update
          </button>
        </div>

        <h2 className="adminOrderDetailSectionTitle">Issue refund</h2>
        <div className="adminOrderDetailActionRow">
          <input
            type="text"
            className="adminOrderDetailInput"
            placeholder="Reason for refund"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <button
            type="button"
            className="adminOrderDetailButton adminOrderDetailButton--destructive"
            onClick={() => setIsRefundModalOpen(true)}
            disabled={isRefunding || !refundReason.trim() || order.order.status === "Cancelled"}
          >
            Refund
          </button>
        </div>

        <h2 className="adminOrderDetailSectionTitle">
          <StickyNote size={16} /> Internal notes
        </h2>
        <ul className="adminOrderDetailNotesList">
          {order.internalNotes.length === 0 && <li className="adminOrderDetailLineMuted">No internal notes yet.</li>}
          {order.internalNotes.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="adminOrderDetailNoteRow">
              <p>{entry.note}</p>
              <p className="adminOrderDetailLineMuted">{formatDateTime(entry.createdAt)}</p>
            </li>
          ))}
        </ul>
        <div className="adminOrderDetailActionRow">
          <input
            type="text"
            className="adminOrderDetailInput"
            placeholder="Add an internal note"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <button
            type="button"
            className="adminOrderDetailButton adminOrderDetailButton--secondary"
            onClick={handleAddNote}
            disabled={isAddingNote || !noteDraft.trim()}
          >
            Add note
          </button>
        </div>

        <h2 className="adminOrderDetailSectionTitle">
          <Mail size={16} /> Email buyer
        </h2>
        <div className="adminOrderDetailEmailForm">
          <select
            className="adminOrderDetailSelect"
            value={emailPreset}
            onChange={(e) => setEmailPreset(e.target.value)}
            aria-label="Email preset"
          >
            {EMAIL_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="adminOrderDetailInput"
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
          <textarea
            className="adminOrderDetailTextarea"
            placeholder="Message"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={4}
          />
          <button
            type="button"
            className="adminOrderDetailButton adminOrderDetailButton--primary"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
          >
            {isSendingEmail ? "Sending…" : "Send email"}
          </button>
        </div>
      </section>

      <ConfirmationModal
        isOpen={isStatusModalOpen}
        title="Update order status?"
        description={`Change this order's status to "${statusChoice}"? ${order.buyer.isGuest ? "" : "The buyer will be notified."}`}
        confirmLabel="Update Status"
        onConfirm={handleStatusConfirm}
        onCancel={() => setIsStatusModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isRefundModalOpen}
        title="Issue refund?"
        description={`Refund order #${order.order.id.slice(-8).toUpperCase()} and mark it Cancelled? This cannot be undone.`}
        confirmLabel="Refund"
        onConfirm={handleRefundConfirm}
        onCancel={() => setIsRefundModalOpen(false)}
      />
    </>
  );
}
