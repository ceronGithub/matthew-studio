/**
 * FILE: components/security-logs/SecurityLogsList.tsx
 * ROLE: Super-Admin only — rendered inside app/superAdmin/security-logs/page.tsx.
 *
 * PURPOSE:
 * Completes task-45 (UI half): the DataTable-style viewer for
 * super_admin_account_specification.md Section 3.3 (Rule 38.9),
 * wired to the already-live API half — GET /api/superadmin/security-logs.
 * Handles all three required data states (Rule 25): loading skeleton,
 * empty state, and error state with retry. Read-only — no destructive
 * actions, so no ConfirmationModal/ToastStack for mutations, but a
 * toast still confirms the CSV export result. Same visual pattern as
 * GatekeeperBansList.tsx.
 */
"use client";

import { Download, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { useSecurityLogs } from "@/lib/hooks/useSecurityLogs";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import SecurityLogRow from "@/components/security-logs/SecurityLogRow";

const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All events" },
  { value: "login_success", label: "Login success" },
  { value: "login_failed", label: "Login failed" },
  { value: "registration_failed", label: "Registration failed" },
  { value: "admin_login_denied", label: "Admin login denied" },
  { value: "rate_limit_hit", label: "Rate limit hit" },
  { value: "location_anomaly", label: "Location anomaly" },
  { value: "device_change", label: "Device change" },
  { value: "sql_injection_attempt", label: "SQL injection attempt" },
];

const DEVICE_TYPE_FILTERS = [
  { value: "all", label: "All devices" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
];

// Converts the currently loaded (already-filtered) page of rows into a
// CSV file and triggers a browser download — no server round trip
// needed since the export always reflects what's on screen.
function exportRowsToCsv(rows: ReturnType<typeof useSecurityLogs>["logs"]): void {
  const headers = ["Event Type", "Actor", "Device Type", "City", "Country", "IP Address", "Timestamp"];
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      [row.eventType, row.actor ?? "", row.deviceType ?? "", row.geoCity ?? "", row.geoCountry ?? "", row.ipAddress ?? "", row.createdAt]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `security-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SecurityLogsList() {
  const {
    logs,
    totalPages,
    page,
    isLoading,
    error,
    eventType,
    deviceType,
    geoCountry,
    dateFrom,
    dateTo,
    setEventType,
    setDeviceType,
    setGeoCountry,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  } = useSecurityLogs();

  const { toasts, showToast, dismissToast } = useToast();

  function handleExport() {
    if (logs.length === 0) {
      showToast("✕ No rows to export for the current filters.", "error");
      return;
    }
    exportRowsToCsv(logs);
    showToast("✓ Security logs exported to CSV.", "success");
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

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

        <select
          className="securityLogsFilterSelect"
          value={deviceType}
          onChange={(event) => setDeviceType(event.target.value)}
          aria-label="Filter by device type"
        >
          {DEVICE_TYPE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="securityLogsFilterCountry"
          placeholder="Country (e.g. PH)"
          value={geoCountry}
          maxLength={2}
          onChange={(event) => setGeoCountry(event.target.value.toUpperCase())}
          aria-label="Filter by country ISO code"
        />

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

        <button type="button" className="securityLogsExportButton" onClick={handleExport}>
          <Download size={16} />
          Export CSV
        </button>
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
