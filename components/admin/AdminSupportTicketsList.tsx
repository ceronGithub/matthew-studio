/**
 * FILE: components/admin/AdminSupportTicketsList.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/support/page.tsx.
 *
 * PURPOSE:
 * Ticket inbox (Task 17, admin_support_ticket_specification.md
 * Sections 2/5): every ticket across all buyers, newest activity
 * first, with status filter tabs (all/open/answered/closed). Handles
 * all three required data states (Rule 25): loading skeleton, empty
 * state, and error state with retry. Clicking a row navigates to
 * /admin/support/[ticketId] (thread + reply UI is Task 18).
 *
 * Reuses lib/ticketStatus.ts's label/color mapping — the same 3
 * status values (open/answered/closed) mean the same thing on both
 * the buyer and admin side, so there's no separate admin status
 * display needed.
 */
"use client";

import Link from "next/link";
import { LifeBuoy, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminSupportTickets, type AdminTicketStatusFilter } from "@/lib/hooks/useAdminSupportTickets";
import { getTicketStatusDisplay } from "@/lib/ticketStatus";

const STATUS_TABS: { key: AdminTicketStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "closed", label: "Closed" },
];

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminSupportTicketsList() {
  const {
    tickets,
    totalPages,
    page,
    isLoading,
    error,
    statusFilter,
    changeStatusFilter,
    goToPage,
    refetch,
  } = useAdminSupportTickets();

  return (
    <>
      <div className="adminSupportFilterTabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`adminSupportFilterTab${statusFilter === tab.key ? " adminSupportFilterTab--active" : ""}`}
            onClick={() => changeStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="adminSupportGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="adminSupportRow adminSupportRow--skeleton">
              <div className="adminSupportSkeletonLine skeletonBlock" />
              <div className="adminSupportSkeletonLine skeletonBlock adminSupportSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="adminSupportEmptyState">
          <LifeBuoy size={32} />
          <p>{error}</p>
          <button type="button" className="adminSupportRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="adminSupportEmptyState">
          <LifeBuoy size={32} />
          <p>No tickets match this filter.</p>
        </div>
      ) : (
        <>
          <div className="adminSupportGrid">
            {tickets.map((ticket) => {
              const statusDisplay = getTicketStatusDisplay(ticket.status);

              return (
                <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="adminSupportRow">
                  <div className="adminSupportRowMain">
                    <h2 className="adminSupportSubject">{ticket.subject}</h2>
                    <p className="adminSupportBuyerEmail">{ticket.buyerEmail ?? "Unknown buyer"}</p>
                    <p className="adminSupportPreview">{ticket.lastMessagePreview}</p>
                  </div>

                  <div className="adminSupportRowMeta">
                    <span className="adminSupportStatusBadge" style={{ color: `var(${statusDisplay.colorVar})` }}>
                      {statusDisplay.label}
                    </span>
                    <span className="adminSupportDate">{formatTicketDate(ticket.lastMessageAt)}</span>
                    {ticket.orderId && <span className="adminSupportOrderTag">Order #{ticket.orderId.slice(-8)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="adminSupportPagination">
              <button
                type="button"
                className="adminSupportPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="adminSupportPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="adminSupportPageButton"
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
