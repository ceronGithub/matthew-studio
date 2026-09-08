/**
 * FILE: components/security-logs/AdminSecurityLogsList.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/security-logs/page.tsx.
 *
 * PURPOSE:
 * Completes task-42 (UI half, admin_account_specification.md Section
 * 3.6): the self-scoped Security Logs viewer for a permitted admin.
 * Wired to GET /api/admin/security-logs, which is always filtered
 * server-side to the calling admin's own email — this component
 * never re-applies that scope, it only renders what the API already
 * scoped down. Reuses SecurityLogRow (task-45's row component) as-is
 * rather than building a new one, per Rule 2's no-rewrite/reuse
 * standard — the row shape returned by the admin route is identical
 * to the super-admin route.
 *
 * Deliberately narrower than SecurityLogsList.tsx (the super-admin
 * version): only the Event Type and Date Range filters Section 3.6
 * calls for, restricted to admin-relevant event types
 * (login_success, login_failed, rate_limit_hit, device_change — the
 * same list the API route itself accepts). No device/country filter,
 * no CSV export — not part of this section's spec. Handles all three
 * required data states (Rule 25) plus a fourth: the permission-denied
 * state, mirrored from components/admin/AdminAnalytics.tsx's
 * isForbidden pattern.
 */
"use client";

import { ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminSecurityLogs } from "@/lib/hooks/useAdminSecurityLogs";
import SecurityLogRow from "@/components/security-logs/SecurityLogRow";

// Section 3.6's own filter list — mirrors ADMIN_VISIBLE_EVENT_TYPES in
// app/api/admin/security-logs/route.ts; any other value is ignored server-side.
const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All events" },
  { value: "login_success", label: "Login success" },
  { value: "login_failed", label: "Login failed" },
  { value: "rate_limit_hit", label: "Rate limit hit" },
  { value: "device_change", label: "Device change" },
];

export default function AdminSecurityLogsList() {
  const {
    logs,
    totalPages,
    page,
    isLoading,
    error,
    isForbidden,
    eventType,
    dateFrom,
    dateTo,
    setEventType,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  } = useAdminSecurityLogs();

  if (isForbidden) {
    return (
      <div className="securityLogsEmptyState">
        <ShieldAlert size={32} />
        <p>
          You don&rsquo;t have permission to view security logs. Ask a super-admin to grant the
          &ldquo;view-security-logs&rdquo; permission on your account.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="securityLogsToolbar">
        <select
          className="securityLogsFilterSelect"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          aria-label="Filter by event type"
        >
          {EVENT_TYPE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="securityLogsFilterDate"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="securityLogsFilterDate"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="To date"
        />
      </div>

      {isLoading ? (
        <div className="securityLogsGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="securityLogRow securityLogRow--skeleton">
              <div className="securityLogsSkeletonLine skeletonBlock" />
              <div className="securityLogsSkeletonLine skeletonBlock securityLogsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="securityLogsEmptyState">
          <ShieldAlert size={32} />
          <p>{error}</p>
          <button type="button" className="securityLogsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="securityLogsEmptyState">
          <ShieldAlert size={32} />
          <p>No security events match these filters.</p>
        </div>
      ) : (
        <>
          <div className="securityLogsGrid">
            {logs.map((log) => (
              <SecurityLogRow key={log.id} log={log} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="securityLogsPagination">
              <button
                type="button"
                className="securityLogsPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="securityLogsPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="securityLogsPageButton"
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
