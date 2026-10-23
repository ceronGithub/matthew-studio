/**
 * FILE: components/admin/RefundRequestsList.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/refund-requests/page.tsx.
 *
 * PURPOSE:
 * The admin refund requests queue (task-55e,
 * additional_platform_gaps_specification.md Section 4.2): a paginated
 * list with a status filter, and Approve / Deny on each pending request.
 * Both decisions open the shared ConfirmationModal (Rule 34.4) that names
 * the order and the amount; deny needs a note first. Handles the three
 * required data states (Rule 25): loading skeleton, empty state, and
 * error state with retry. Every decision fires an action-specific toast
 * (Rule 22.7).
 *
 * DATA FLOW:
 * 1. useRefundRequests loads the page and runs the decision call.
 * 2. Note text per request is kept here, so it survives list refreshes.
 * 3. Clicking Approve / Deny opens the modal; Confirm calls decideRequest,
 *    then the toast shows the server's result.
 */
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useRefundRequests } from "@/lib/hooks/useRefundRequests";
import type { AdminRefundRequestItem, RefundDecision, RefundStatusFilter } from "@/lib/hooks/useRefundRequests";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import RefundRequestCard from "@/components/admin/RefundRequestCard";

const FILTER_TABS: { value: RefundStatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "all", label: "All" },
];

// Rule 18.1 characters, minus whitespace — spaces between words must stay typeable.
const FORBIDDEN_NOTE_CHARACTERS = /[<>{}[\]/\\;'"`=-]/g;

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RefundRequestsList() {
  const {
    requests,
    totalPages,
    totalCount,
    page,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    goToPage,
    refetch,
    decideRequest,
  } = useRefundRequests();

  const { toasts, showToast, dismissToast } = useToast();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [pendingDecision, setPendingDecision] = useState<{
    request: AdminRefundRequestItem;
    decision: RefundDecision;
  } | null>(null);
  // Toasts vanish after 2 seconds, so a failure where the outcome is unsure also stays on screen here.
  const [persistentAlert, setPersistentAlert] = useState<string | null>(null);

  function handleNoteChange(requestId: string, value: string) {
    // Silently drops the forbidden characters as they are typed (Rule 18.1).
    setNoteDrafts((current) => ({ ...current, [requestId]: value.replace(FORBIDDEN_NOTE_CHARACTERS, "") }));
  }

  /**
   * handleDecisionConfirm
   * Runs the decision the admin just confirmed in the modal, closes the
   * modal, then toasts the result. A server error (500/502) or a lost
   * connection also leaves a persistent banner, because the refund may
   * have reached PayMongo and the message can hold a refund id to keep.
   */
  async function handleDecisionConfirm() {
    if (!pendingDecision) return;
    const { request, decision } = pendingDecision;
    const result = await decideRequest(request.id, decision, (noteDrafts[request.id] ?? "").trim());
    setPendingDecision(null);

    if (result.success) {
      setNoteDrafts((current) => {
        const remainingDrafts = { ...current };
        delete remainingDrafts[request.id];
        return remainingDrafts;
      });
      setPersistentAlert(null);
      if (decision === "approve") {
        showToast(`✓ Refund of ${formatPeso(request.refundAmount)} approved for order #${request.orderShortId}.`, "success");
      } else {
        showToast(`✕ Refund request for order #${request.orderShortId} denied.`, "error");
      }
      return;
    }

    showToast(`✕ ${result.message}`, "error");
    if (result.httpStatus === 0 || result.httpStatus >= 500) setPersistentAlert(result.message);
  }

  const modalTitle = pendingDecision?.decision === "approve" ? "Approve refund?" : "Deny refund request?";
  const modalDescription = !pendingDecision
    ? ""
    : pendingDecision.decision === "approve"
      ? `Refund ${formatPeso(pendingDecision.request.refundAmount)} for order #${pendingDecision.request.orderShortId} to ${
          pendingDecision.request.buyerEmail ?? "the buyer"
        }? The money is sent back through PayMongo, the order is marked Refunded, and this cannot be undone.`
      : `Deny the ${formatPeso(pendingDecision.request.refundAmount)} refund request for order #${
          pendingDecision.request.orderShortId
        }? The buyer will see your note and be told it was denied.`;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="refundQueueToolbar">
        <div className="refundQueueTabs" role="group" aria-label="Filter by status">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`refundQueueTab${statusFilter === tab.value ? " refundQueueTab--active" : ""}`}
              aria-pressed={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="refundQueueSortHint">
          {statusFilter === "pending" ? "Oldest first — the longest wait is at the top" : "Newest first"}
        </p>
      </div>

      {persistentAlert && (
        <div className="refundQueueAlert" role="alert">
          <p>{persistentAlert}</p>
          <button type="button" className="refundQueueAlertDismiss" onClick={() => setPersistentAlert(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="refundQueueList">
          {[0, 1, 2].map((index) => (
            <div key={index} className="refundQueueCard refundQueueCard--skeleton">
              <div className="refundQueueSkeletonLine skeletonBlock" />
              <div className="refundQueueSkeletonLine skeletonBlock refundQueueSkeletonLine--short" />
              <div className="refundQueueSkeletonLine skeletonBlock" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="refundQueueEmptyState">
          <Undo2 size={32} />
          <p>{error}</p>
          <button type="button" className="refundQueueRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="refundQueueEmptyState">
          <Undo2 size={32} />
          <p>
            {statusFilter === "pending"
              ? "No pending refund requests. You're all caught up."
              : statusFilter === "all"
                ? "No refund requests yet."
                : `No ${statusFilter} refund requests.`}
          </p>
        </div>
      ) : (
        <>
          <div className="refundQueueList">
            {requests.map((request) => (
              <RefundRequestCard
                key={request.id}
                request={request}
                noteValue={noteDrafts[request.id] ?? ""}
                onNoteChange={handleNoteChange}
                onDecide={(selectedRequest, decision) => setPendingDecision({ request: selectedRequest, decision })}
              />
            ))}
          </div>

          <div className="refundQueueFooter">
            <span className="refundQueueTotalCount">
              {totalCount} request{totalCount === 1 ? "" : "s"}
            </span>

            {totalPages > 1 && (
              <div className="refundQueuePagination">
                <button
                  type="button"
                  className="refundQueuePageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="refundQueuePageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="refundQueuePageButton"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={pendingDecision !== null}
        title={modalTitle}
        description={modalDescription}
        confirmLabel={pendingDecision?.decision === "approve" ? "Approve refund" : "Deny request"}
        onConfirm={handleDecisionConfirm}
        onCancel={() => setPendingDecision(null)}
      />
    </>
  );
}
