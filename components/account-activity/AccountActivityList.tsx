/**
 * FILE: components/account-activity/AccountActivityList.tsx
 * ROLE: Super-Admin only — rendered inside
 * app/superAdmin/account-activity/page.tsx.
 *
 * PURPOSE:
 * Completes task-46: the DataTable-style viewer for
 * super_admin_account_specification.md Section 3.4 (Rule 42.3),
 * wired to GET /api/superadmin/account-activity. Handles all three
 * required data states (Rule 25): loading skeleton, empty state, and
 * error state with retry. Read-only — no destructive actions, so no
 * ConfirmationModal/ToastStack needed (unlike
 * SecurityLogsList.tsx, which needs a toast for its CSV export —
 * Section 3.4 doesn't list an export requirement).
 */
"use client";

import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useAccountActivity } from "@/lib/hooks/useAccountActivity";
import AccountActivityRow from "@/components/account-activity/AccountActivityRow";

export default function AccountActivityList() {
  const {
    logs,
    totalPages,
    page,
    accounts,
    isLoading,
    error,
    accountId,
    action,
    dateFrom,
    dateTo,
    setAccountId,
    setAction,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  } = useAccountActivity();

  return (
    <>
      <div className="accountActivityToolbar">
        <select
          className="accountActivityFilterSelect"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          aria-label="Filter by account"
        >
          <option value="all">All accounts</option>
          {accounts.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="accountActivityFilterAction"
          placeholder="Action (e.g. product-updated or /superAdmin)"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          aria-label="Filter by action"
        />

        <input
          type="date"
          className="accountActivityFilterDate"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="accountActivityFilterDate"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="To date"
        />
      </div>

      {isLoading ? (
        <div className="accountActivityGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="accountActivityRow accountActivityRow--skeleton">
              <div className="accountActivitySkeletonLine skeletonBlock" />
              <div className="accountActivitySkeletonLine skeletonBlock accountActivitySkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="accountActivityEmptyState">
          <Activity size={32} />
          <p>{error}</p>
          <button type="button" className="accountActivityRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="accountActivityEmptyState">
          <Activity size={32} />
          <p>No account activity matches these filters.</p>
        </div>
      ) : (
        <>
          <div className="accountActivityGrid">
            {logs.map((log) => (
              <AccountActivityRow key={log.id} log={log} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="accountActivityPagination">
              <button
                type="button"
                className="accountActivityPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="accountActivityPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="accountActivityPageButton"
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
