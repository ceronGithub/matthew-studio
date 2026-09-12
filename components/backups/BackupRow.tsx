/**
 * FILE: components/backups/BackupRow.tsx
 * ROLE: Rendered only by components/backups/BackupsList.tsx, one per
 * BackupLog row.
 *
 * PURPOSE:
 * task-105's required row shape (Rule 40.6): status badge, file
 * size, both destination links when present, and the recorded error
 * message when a run failed or partially failed. Read-only — no
 * actions on this row, same as AccountActivityRow.tsx and
 * SecurityLogRow.tsx. Not expandable — unlike those two rows, every
 * field here is already short enough to show inline at all times, so
 * there's no collapsed/expanded distinction to make.
 */
"use client";

import { ExternalLink } from "lucide-react";
import type { BackupLogListItem } from "@/lib/hooks/useBackups";

interface BackupRowProps {
  log: BackupLogListItem;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Converts a raw byte count into a human-readable size (e.g. "42.3 MB").
// Returns "—" when the size isn't known yet (e.g. a run still in progress).
function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function BackupRow({ log }: BackupRowProps) {
  return (
    <div className="backupsRow">
      <div className="backupsRowSummary">
        {/* Status badge — success (green) / failed (red) / running (amber), per Rule 40.6 */}
        <span className={`backupsStatusBadge backupsStatusBadge--${log.status}`}>{log.status}</span>

        <span className="backupsRowSize">{formatFileSize(log.fileSizeBytes)}</span>

        <span className="backupsRowDate">{formatDate(log.startedAt)}</span>
        <span className="backupsRowDate backupsRowDate--muted">
          {log.completedAt ? formatDate(log.completedAt) : "In progress"}
        </span>

        <div className="backupsRowLinks">
          {log.r2Url && (
            <a
              href={log.r2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="backupsRowLink"
            >
              R2 <ExternalLink size={12} />
            </a>
          )}
          {log.driveViewLink && (
            <a
              href={log.driveViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="backupsRowLink"
            >
              Drive <ExternalLink size={12} />
            </a>
          )}
          {!log.r2Url && !log.driveViewLink && <span className="backupsRowLinksEmpty">—</span>}
        </div>
      </div>

      {/* Error message — only rendered when the run failed or partially failed */}
      {log.errorMessage && <p className="backupsRowError">{log.errorMessage}</p>}
    </div>
  );
}
