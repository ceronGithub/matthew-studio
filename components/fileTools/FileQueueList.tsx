/**
 * FILE: components/fileTools/FileQueueList.tsx
 * ROLE: Public — shared by every File Tools workspace (convert + rename).
 *
 * PURPOSE:
 * Lists the files waiting to be processed. Each row shows the file name, its
 * detected type, its size and a status pill: Queued -> Converting -> Done or
 * Failed (bulk_file_converter_and_pdf_renamer_specification.md Section 2.3,
 * step 2). A failed row also shows the reason underneath, never a raw error
 * (Section 2.3 step 6, Rule 34.1). Presentational only: the parent owns the
 * list and changes each row's status as work progresses.
 *
 * DATA FLOW:
 * 1. Parent passes `fileQueueItems` (already validated by FileDropZone).
 * 2. This list renders loading skeleton rows, the empty message, or the rows.
 * 3. "Remove" calls onRemoveFile(id); the parent deletes the item.
 */
"use client";

import { fileToolMessages } from "@/lib/errorMessages";
import { detectedKindLabels, formatFileSize, type DetectedFileKind } from "@/lib/fileTools/fileValidation";
import "../../app/styles/fileTools.css";

/** The four states a queued file moves through (Section 2.3, step 2). */
export type FileQueueStatus = "queued" | "converting" | "done" | "failed";

/** One row in the queue. `id` must stay stable for the life of the row. */
export interface FileQueueItem {
  id: string;
  fileName: string;
  sizeInBytes: number;
  kind: DetectedFileKind;
  status: FileQueueStatus;
  /** Sentence shown under a failed row. Ignored for every other status. */
  failureReason?: string;
}

interface FileQueueListProps {
  fileQueueItems: FileQueueItem[];
  /** Shows placeholder rows instead of the list (Rule 25.2). */
  isLoading?: boolean;
  /** When given, every row gets a Remove button (disabled while that row is converting). */
  onRemoveFile?: (fileId: string) => void;
}

// Text shown inside each status pill. The word is always shown, so colour is never the only signal.
const statusLabels: Record<FileQueueStatus, string> = {
  queued: "Queued",
  converting: "Converting",
  done: "Done",
  failed: "Failed",
};

// How many placeholder rows the loading skeleton shows.
const skeletonRowCount = 3;

export default function FileQueueList({
  fileQueueItems,
  isLoading = false,
  onRemoveFile,
}: FileQueueListProps) {
  // Loading state (Rule 25.2): rows shaped like the real ones, not a spinner.
  if (isLoading) {
    return (
      <section className="fileQueueSection" aria-label="Files to convert" aria-busy="true">
        <div className="fileQueueLayout">
          <ul className="fileQueueList">
            {Array.from({ length: skeletonRowCount }, (_, skeletonIndex) => (
              <li key={skeletonIndex} className="fileQueueRow fileQueueRowSkeleton" aria-hidden="true">
                <span className="skeletonBlock fileQueueSkeletonName" />
                <span className="skeletonBlock fileQueueSkeletonMeta" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // Empty state (Rule 25.3): an icon plus a message that says what to do next.
  if (fileQueueItems.length === 0) {
    return (
      <section className="fileQueueSection" aria-label="Files to convert">
        <div className="fileQueueLayout">
          <div className="fileQueueEmpty">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <p>{fileToolMessages.emptyQueue}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fileQueueSection" aria-label="Files to convert">
      <div className="fileQueueLayout">
        <ul className="fileQueueList">
          {fileQueueItems.map((fileQueueItem) => (
            <li key={fileQueueItem.id} className="fileQueueRow">
              <div className="fileQueueRowMain">
                <p className="fileQueueFileName">{fileQueueItem.fileName}</p>
                <p className="fileQueueFileMeta">
                  <span className="fileQueueKindTag">{detectedKindLabels[fileQueueItem.kind]}</span>
                  <span>{formatFileSize(fileQueueItem.sizeInBytes)}</span>
                </p>
                {fileQueueItem.status === "failed" && fileQueueItem.failureReason && (
                  <p className="fileQueueFailureReason" role="alert">
                    {fileQueueItem.failureReason}
                  </p>
                )}
              </div>

              <div className="fileQueueRowActions">
                <span className={`fileQueueStatusPill fileQueueStatus_${fileQueueItem.status}`}>
                  {statusLabels[fileQueueItem.status]}
                </span>

                {onRemoveFile && (
                  <button
                    type="button"
                    className="buttonSecondary fileQueueRemoveButton"
                    onClick={() => onRemoveFile(fileQueueItem.id)}
                    // A file that is being converted cannot be pulled out from under the engine.
                    disabled={fileQueueItem.status === "converting"}
                    aria-label={`Remove ${fileQueueItem.fileName}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
