/**
 * FILE: components/admin/AdminSupportTicketDetail.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/support/[ticketId]/page.tsx.
 *
 * PURPOSE:
 * Ticket detail thread UI (Task 18, admin_support_ticket_specification.md
 * Sections 2/5): full message thread (buyer/admin visually
 * distinguished, reusing the buyer-side thread styling classes from
 * app/styles/buyerSupport.css so both sides render identically), a
 * reply box that sends as senderRole "admin" and auto-flips status to
 * "answered" server-side, and a manual "Close ticket" action gated by
 * the shared ConfirmationModal (Rule 34.4) since it's a state change
 * the buyer will see reflected on their own ticket. Handles all three
 * required data states (Rule 25) plus a "not found" state, same
 * pattern as SupportTicketThread.tsx.
 */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Loader2, XCircle, User, Headset } from "lucide-react";
import { useAdminSupportTicketDetail } from "@/lib/hooks/useAdminSupportTicketDetail";
import { getTicketStatusDisplay } from "@/lib/ticketStatus";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

function formatMessageTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AdminSupportTicketDetailProps {
  ticketId: string;
}

export default function AdminSupportTicketDetail({ ticketId }: AdminSupportTicketDetailProps) {
  const { ticket, isLoading, error, sendReply, isReplying, closeTicket, isClosing } =
    useAdminSupportTicketDetail(ticketId);
  const { toasts, showToast, dismissToast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (replyText.trim().length < 1) {
      setReplyError("Enter a message before sending.");
      return;
    }
    setReplyError("");

    const result = await sendReply(replyText.trim());
    if (result.success) {
      showToast("✓ Reply sent.", "success");
      setReplyText("");
    } else {
      showToast("✕ " + result.message, "error");
    }
  }

  async function handleCloseConfirm() {
    const result = await closeTicket();
    setIsCloseModalOpen(false);
    showToast(result.success ? "✓ Ticket closed." : "✕ " + result.message, result.success ? "success" : "error");
  }

  if (isLoading) {
    return (
      <div className="ticketThreadSkeleton">
        <div className="skeletonBlock ticketThreadSkeletonLine" />
        <div className="skeletonBlock ticketThreadSkeletonBubble" />
        <div className="skeletonBlock ticketThreadSkeletonBubble ticketThreadSkeletonBubble--short" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="adminSupportEmptyState">
        <LifeBuoy size={32} />
        <p>{error ?? "We couldn't find that support ticket."}</p>
        <Link href="/admin/support" className="adminSupportRetryButton">
          Back to Support
        </Link>
      </div>
    );
  }

  const statusDisplay = getTicketStatusDisplay(ticket.status);
  const isClosed = ticket.status === "closed";

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <Link href="/admin/support" className="ticketThreadBackLink">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="ticketThreadHeader">
        <div>
          <h1 className="ticketThreadSubject">{ticket.subject}</h1>
          <p className="adminSupportBuyerEmail">{ticket.buyerEmail ?? "Unknown buyer"}</p>
          {ticket.orderId && <p className="ticketThreadOrderNote">Linked to order #{ticket.orderId.slice(-8)}</p>}
        </div>
        <div className="ticketThreadHeaderRight">
          <span className="supportTicketStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
            {statusDisplay.label}
          </span>
          {!isClosed && (
            <button
              type="button"
              className="ticketThreadReopenButton"
              onClick={() => setIsCloseModalOpen(true)}
            >
              <XCircle size={14} />
              Close ticket
            </button>
          )}
        </div>
      </div>

      <div className="ticketThreadMessages">
        {ticket.messages.map((entry) => {
          const isAdminMessage = entry.senderRole === "admin";
          return (
            <div
              key={entry.id}
              className={`ticketThreadMessage ${isAdminMessage ? "ticketThreadMessage--buyer" : "ticketThreadMessage--admin"}`}
            >
              <div className="ticketThreadMessageIcon">{isAdminMessage ? <Headset size={14} /> : <User size={14} />}</div>
              <div className="ticketThreadMessageBubble">
                <p className="ticketThreadMessageSender">{isAdminMessage ? "You (Admin)" : "Buyer"}</p>
                <p className="ticketThreadMessageBody">{entry.body}</p>
                <p className="ticketThreadMessageTime">{formatMessageTimestamp(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form className="ticketThreadReplyForm" onSubmit={handleReplySubmit} noValidate>
        <label className="ticketThreadReplyLabel" htmlFor="adminTicketReplyTextarea">
          {isClosed ? "This ticket is closed" : "Reply"}
        </label>
        <textarea
          id="adminTicketReplyTextarea"
          rows={3}
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          aria-invalid={Boolean(replyError)}
        />
        {replyError && <span role="alert" className="newTicketFormError">{replyError}</span>}
        <div className="ticketThreadReplyActions">
          <button type="submit" className="newTicketFormSubmit" disabled={isReplying}>
            {isReplying ? <Loader2 size={16} className="adminSupportSpin" /> : null}
            {isReplying ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={isCloseModalOpen}
        title="Close ticket?"
        description={`Are you sure you want to close "${ticket.subject}"? The buyer can still reply to reopen it later.`}
        confirmLabel={isClosing ? "Closing…" : "Close ticket"}
        onConfirm={handleCloseConfirm}
        onCancel={() => setIsCloseModalOpen(false)}
      />
    </>
  );
}
