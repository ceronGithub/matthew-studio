/**
 * FILE: components/buyer/SupportTicketsList.tsx
 * ROLE: Buyer only — rendered inside app/buyer/support/page.tsx.
 *
 * PURPOSE:
 * Support Tickets list (Task 09, buyer_account_specification.md
 * Section 4.5): a "New ticket" button that reveals
 * NewSupportTicketForm.tsx, and one row per ticket, newest first,
 * 10 per page — same card/pagination pattern as OrdersList.tsx.
 * Handles all three required data states (Rule 25): loading
 * skeleton, empty state with a CTA to open the new-ticket form, and
 * error state with retry. Clicking a row navigates to
 * /buyer/support/[ticketId] (thread UI itself is Task 10).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useBuyerSupportTickets } from "@/lib/hooks/useBuyerSupportTickets";
import { getTicketStatusDisplay } from "@/lib/ticketStatus";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import NewSupportTicketForm from "@/components/buyer/NewSupportTicketForm";

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface SupportTicketsListProps {
  // Pre-fills the new-ticket form and auto-opens it when the buyer
  // arrives via ?orderId=... (wired from OrderTrackingDetail in Task
  // 10 — this page already supports it ahead of that change).
  prefillOrderId: string | null;
}

export default function SupportTicketsList({ prefillOrderId }: SupportTicketsListProps) {
  const { tickets, totalPages, page, isLoading, error, goToPage, refetch } = useBuyerSupportTickets();
  const [isFormOpen, setIsFormOpen] = useState(Boolean(prefillOrderId));
  const { toasts, showToast, dismissToast } = useToast();

  function handleCreated() {
    setIsFormOpen(false);
    refetch();
  }

  if (isLoading) {
    return (
      <div className="supportTicketsGrid">
        {[0, 1, 2].map((index) => (
          <div key={index} className="supportTicketCard supportTicketCard--skeleton">
            <div className="supportTicketSkeletonIcon skeletonBlock" />
            <div className="supportTicketSkeletonLine skeletonBlock" />
            <div className="supportTicketSkeletonLine skeletonBlock supportTicketSkeletonLine--short" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="supportTicketsEmptyState">
        <LifeBuoy size={32} />
        <p>{error}</p>
        <button type="button" className="supportTicketsRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="supportTicketsToolbar">
        {!isFormOpen && (
          <button type="button" className="supportTicketsNewButton" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} /> New ticket
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="newTicketFormWrapper">
          <div className="newTicketFormHeader">
            <h2>New support ticket</h2>
            <button
              type="button"
              className="newTicketFormClose"
              onClick={() => setIsFormOpen(false)}
              aria-label="Close new ticket form"
            >
              <X size={18} />
            </button>
          </div>
          <NewSupportTicketForm
            orderId={prefillOrderId}
            onCancel={() => setIsFormOpen(false)}
            onCreated={handleCreated}
            showToast={showToast}
          />
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="supportTicketsEmptyState">
          <LifeBuoy size={32} />
          <p>No support tickets yet.</p>
          {!isFormOpen && (
            <button type="button" className="supportTicketsRetryButton" onClick={() => setIsFormOpen(true)}>
              Open your first ticket
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="supportTicketsGrid">
            {tickets.map((ticket) => {
              const statusDisplay = getTicketStatusDisplay(ticket.status);

              return (
                <Link key={ticket.id} href={`/buyer/support/${ticket.id}`} className="supportTicketCard">
                  <div className="supportTicketIconWrapper">
                    <LifeBuoy size={20} />
                  </div>

                  <div className="supportTicketCardBody">
                    <h2 className="supportTicketSubject">{ticket.subject}</h2>
                    <p className="supportTicketPreview">{ticket.lastMessagePreview}</p>
                    <p className="supportTicketDate">{formatTicketDate(ticket.lastMessageAt)}</p>
                  </div>

                  <div className="supportTicketCardMeta">
                    <span className="supportTicketStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
                      {statusDisplay.label}
                    </span>
                    {ticket.orderId && <span className="supportTicketOrderTag">Order #{ticket.orderId.slice(-8)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="supportTicketsPagination">
              <button
                type="button"
                className="supportTicketsPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="supportTicketsPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="supportTicketsPageButton"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
