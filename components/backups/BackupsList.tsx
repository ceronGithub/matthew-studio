/**
 * FILE: components/backups/BackupsList.tsx
 * ROLE: Super-Admin only — rendered inside
 * app/superAdmin/backups/page.tsx.
 *
 * PURPOSE:
 * Completes task-105: the DataTable-style viewer for Rule 40.6's
 * mandatory Backups page, wired to the already-live API half —
 * GET /api/superadmin/backups (task-104). Handles all three
 * required data states (Rule 25): loading skeleton, empty state, and
 * error state with retry. Strictly read-only — no "Run Backup Now"
 * button anywhere on this page (Rule 40.6); on-demand runs only
 * happen via GitHub Actions' workflow_dispatch (task-103).
 */
"use client";

import { Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { useBackups } from "@/lib/hooks/useBackups";
import BackupRow from "@/components/backups/BackupRow";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

export default function BackupsList() {
  const { logs, totalPages, page, isLoading, error, status, setStatus, goToPage, refetch } = useBackups();

  return (
    <>
      <div className="backupsToolbar">
        <select
          className="backupsFilterSelect"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="backupsGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="backupsRow backupsRow--skeleton">
              <div className="backupsSkeletonLine skeletonBlock" />
              <div className="backupsSkeletonLine skeletonBlock backupsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="backupsEmptyState">
          <Archive size={32} />
          <p>{error}</p>
          <button type="button" className="backupsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="backupsEmptyState">
          <Archive size={32} />
          <p>No backups have run yet.</p>
        </div>
      ) : (
        <>
          <div className="backupsGrid">
            {logs.map((log) => (
              <BackupRow key={log.id} log={log} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="backupsPagination">
              <button
                type="button"
                className="backupsPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="backupsPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="backupsPageButton"
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
