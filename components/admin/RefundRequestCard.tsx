/**
 * FILE: components/admin/RefundRequestCard.tsx
 * ROLE: Admin/super-admin only — rendered by RefundRequestsList inside
 * app/admin/refund-requests/page.tsx.
 *
 * PURPOSE:
 * One refund request in the admin queue (task-55e): who asked, for which
 * order and how much, the buyer's reason and note. A pending request also
 * shows the review panel — a note box and the Approve / Deny buttons. A
 * decided request shows the admin's note and when it was decided.
 *
 * Split out of RefundRequestsList.tsx to keep both files under the
 * ~150-line component limit (Rule 31.4). It holds no state of its own:
 * the note text and the confirmation modal live in the list, so a note
 * typed here survives a re-render of the list.
 */
"use client";

import Link from "next/link";
import { REFUND_REASONS } from "@/lib/refundValidation";
import type { AdminRefundRequestItem, RefundDecision } from "@/lib/hooks/useRefundRequests";

const NOTE_MAX_LENGTH = 500;

interface RefundRequestCardProps {
  request: AdminRefundRequestItem;
  noteValue: string;
  onNoteChange: (requestId: string, value: string) => void;
  onDecide: (request: AdminRefundRequestItem, decision: RefundDecision) => void;
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * getReasonLabel
 * Turns the stored reason value into the label the buyer picked. An
 * unknown value is shown as-is rather than hidden.
 */
function getReasonLabel(reasonValue: string): string {
  return REFUND_REASONS.find((reason) => reason.value === reasonValue)?.label ?? reasonValue;
}

export default function RefundRequestCard({ request, noteValue, onNoteChange, onDecide }: RefundRequestCardProps) {
  const isPending = request.status === "pending";
  const noteInputId = `refundNote-${request.id}`;

  // The approve route refuses these two cases (409), so the button is disabled up front with the reason shown.
  const approveBlockedReason = !request.hasPaymentOnFile
    ? "No PayMongo payment is on file for this order, so it can't be refunded automatically. Refund it from the PayMongo dashboard."
    : request.orderStatus === "Refunded"
      ? "This order is already marked as refunded. Approving would refund it twice — deny this request with a note instead."
      : null;

  return (
    <article className="refundQueueCard">
      <header className="refundQueueCardHeader">
        <div className="refundQueueCardTitleRow">
          <Link href={`/admin/orders/${request.orderId}`} className="refundQueueOrderLink">
            Order #{request.orderShortId}
          </Link>
          <span className={`refundQueueStatusBadge refundQueueStatusBadge--${request.status}`}>{request.status}</span>
        </div>
        <time className="refundQueueDate" dateTime={request.createdAt}>
          Requested {formatDateTime(request.createdAt)}
        </time>
      </header>

      <dl className="refundQueueDetails">
        <div className="refundQueueDetail">
          <dt>Buyer</dt>
          <dd>{request.buyerEmail ?? "Unknown buyer"}</dd>
        </div>
        <div className="refundQueueDetail">
          <dt>Order total</dt>
          <dd>{formatPeso(request.orderTotal)}</dd>
        </div>
        <div className="refundQueueDetail">
          <dt>Refund amount</dt>
          <dd className="refundQueueAmount">{formatPeso(request.refundAmount)}</dd>
        </div>
        <div className="refundQueueDetail">
          <dt>Reason</dt>
          <dd>{getReasonLabel(request.reason)}</dd>
        </div>
      </dl>

      {request.note && (
        <p className="refundQueueBuyerNote">
          <span className="refundQueueNoteLabel">Buyer note</span>
          {request.note}
        </p>
      )}

      {isPending ? (
        <div className="refundQueueReviewPanel">
          {approveBlockedReason && (
            <p className="refundQueueWarning" role="note">
              {approveBlockedReason}
            </p>
          )}

          <label htmlFor={noteInputId} className="refundQueueReviewLabel">
            Note to the buyer — required to deny, optional to approve
          </label>
          <textarea
            id={noteInputId}
            className="refundQueueNoteInput"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={noteValue}
            onChange={(event) => onNoteChange(request.id, event.target.value)}
            placeholder="Explain your decision. The buyer will see this."
          />
          <span className="refundQueueCharacterCount">
            {noteValue.length} / {NOTE_MAX_LENGTH}
          </span>

          <div className="refundQueueActions">
            <button
              type="button"
              className="refundQueueApproveButton"
              onClick={() => onDecide(request, "approve")}
              disabled={Boolean(approveBlockedReason)}
            >
              Approve refund
            </button>
            <button
              type="button"
              className="refundQueueDenyButton"
              onClick={() => onDecide(request, "deny")}
              disabled={!noteValue.trim()}
            >
              Deny request
            </button>
          </div>
        </div>
      ) : (
        <div className="refundQueueDecision">
          <p className="refundQueueDecisionLine">
            {request.status === "approved" ? "Approved" : "Denied"}
            {request.reviewedAt ? ` on ${formatDateTime(request.reviewedAt)}` : ""}
          </p>
          {request.reviewerNote && (
            <p className="refundQueueBuyerNote">
              <span className="refundQueueNoteLabel">Your note</span>
              {request.reviewerNote}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
