/**
 * FILE: components/buyer/SupportTicketThread.tsx
 * ROLE: Buyer only — rendered inside
 * app/buyer/support/[ticketId]/page.tsx.
 *
 * PURPOSE:
 * Ticket detail thread UI (Task 10, buyer_account_specification.md
 * Section 4.5): every TicketMessage in order, visually distinguishing
 * buyer messages from admin replies (senderRole), a reply box (always
 * available — replying to a "closed" ticket auto-reopens it
 * server-side per the reply route's own logic, so the buyer doesn't
 * need to reopen first just to say "thanks" or add more detail), and
 * a standalone "Reopen" button shown only when status is "closed" for
 * a buyer who wants to reopen without also sending a message yet.
 * Handles all three required data states (Rule 25) plus a "not found"
 * state for a nonexistent or not-owned ticket id, same pattern as
 * OrderTrackingDetail.tsx.
 */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Loader2, RotateCcw, User, Headset } from "lucide-react";
import { useBuyerSupportTicketDetail } from "@/lib/hooks/useBuyerSupportTicketDetail";
import { getTicketStatusDisplay } from "@/lib/ticketStatus";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

function formatMessageTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface SupportTicketThreadProps {
  ticketId: string;
}

export default function SupportTicketThread({ ticketId }: SupportTicketThreadProps) {
  const { ticket, isLoading, error, sendReply, isReplying, reopenTicket, isReopening } =
    useBuyerSupportTicketDetail(ticketId);
  const { toasts, showToast, dismissToast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");

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

  async function handleReopen() {
    const result = await reopenTicket();
    showToast(result.success ? "✓ " + result.message : "✕ " + result.message, result.success ? "success" : "error");
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
      <div className="supportTicketsEmptyState">
        <LifeBuoy size={32} />
        <p>{error ?? "We couldn't find that support ticket."}</p>
        <Link href="/buyer/support" className="supportTicketsRetryButton">
          Back to Support
        </Link>
      </div>
    );
  }

  const statusDisplay = getTicketStatusDisplay(ticket.status);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <Link href="/buyer/support" className="ticketThreadBackLink">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="ticketThreadHeader">
        <div>
          <h1 className="ticketThreadSubject">{ticket.subject}</h1>
          {ticket.orderId && <p className="ticketThreadOrderNote">Linked to order #{ticket.orderId.slice(-8)}</p>}
        </div>
        <div className="ticketThreadHeaderRight">
          <span className="supportTicketStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
            {statusDisplay.label}
          </span>
          {ticket.status === "closed" && (
            <button type="button" className="ticketThreadReopenButton" onClick={handleReopen} disabled={isReopening}>
              {isReopening ? <Loader2 size={14} className="buyerSpin" /> : <RotateCcw size={14} />}
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="ticketThreadMessages">
        {ticket.messages.map((entry) => {
          const isBuyer = entry.senderRole === "buyer";
          return (
            <div key={entry.id} className={`ticketThreadMessage ${isBuyer ? "ticketThreadMessage--buyer" : "ticketThreadMessage--admin"}`}>
              <div className="ticketThreadMessageIcon">{isBuyer ? <User size={14} /> : <Headset size={14} />}</div>
              <div className="ticketThreadMessageBubble">
                <p className="ticketThreadMessageSender">{isBuyer ? "You" : "Matthew Studio Support"}</p>
                <p className="ticketThreadMessageBody">{entry.body}</p>
                <p className="ticketThreadMessageTime">{formatMessageTimestamp(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form className="ticketThreadReplyForm" onSubmit={handleReplySubmit} noValidate>
        <label className="ticketThreadReplyLabel" htmlFor="ticketReplyTextarea">
          {ticket.status === "closed" ? "Replying will reopen this ticket" : "Reply"}
        </label>
        <textarea
          id="ticketReplyTextarea"
          rows={3}
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          aria-invalid={Boolean(replyError)}
        />
        {replyError && <span role="alert" className="newTicketFormError">{replyError}</span>}
        <div className="ticketThreadReplyActions">
          <button type="submit" className="newTicketFormSubmit" disabled={isReplying}>
            {isReplying ? <Loader2 size={16} className="buyerSpin" /> : null}
            {isReplying ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </>
  );
}
