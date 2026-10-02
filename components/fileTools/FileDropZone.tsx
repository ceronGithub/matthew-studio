/**
 * FILE: components/fileTools/FileDropZone.tsx
 * ROLE: Public — shared by every File Tools workspace (convert + rename).
 *
 * PURPOSE:
 * The "drop your files here" area with an "or select files" button
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 2.3, step 1).
 * It checks every added file with validateFiles() and shows, inside the zone,
 * a short list of files that were refused and why (Section 2.3 step 6, Rule 34.1).
 * It does no conversion: accepted files go to the parent through a callback.
 *
 * DATA FLOW:
 * 1. Visitor drops files on the zone or picks them with the button.
 * 2. handleSelectedFiles() sends them to validateFiles() (lib/fileTools/fileValidation.ts).
 * 3. Accepted files go up through onFilesAccepted; refused ones stay here as a list.
 * 4. The file input is cleared so choosing the same file again still fires a change.
 */
"use client";

import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { fileToolMessages } from "@/lib/errorMessages";
import { maxBatchFileCount, maxFileSizeBytes } from "@/lib/fileTools/conversionEngine";
import {
  acceptedFileExtensions,
  validateFiles,
  type AcceptedFile,
  type RejectedFile,
} from "@/lib/fileTools/fileValidation";
import "../../app/styles/fileTools.css";

interface FileDropZoneProps {
  /** Called with the files that passed every check (never an empty list). */
  onFilesAccepted: (acceptedFiles: AcceptedFile[]) => void;
  /** How many valid files are already in the queue, so the 50-file limit counts them. */
  queuedFileCount: number;
  /** true = bulk mode (many files); false = individual mode (one file). */
  allowMultiple?: boolean;
  /** Blocks adding files, e.g. while a conversion is running. */
  isDisabled?: boolean;
}

// Limits shown in the hint line, taken from the engine so the text never drifts.
const maxFileSizeMegabytes = maxFileSizeBytes / (1024 * 1024);

export default function FileDropZone({
  onFilesAccepted,
  queuedFileCount,
  allowMultiple = true,
  isDisabled = false,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);

  const isBlocked = isDisabled || isChecking;

  /**
   * handleSelectedFiles
   * Validates the chosen files, reports the good ones to the parent and keeps
   * the refused ones for display. Runs for both drag-and-drop and the picker.
   */
  async function handleSelectedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setIsChecking(true);
    setRejectedFiles([]);

    const outcome = await validateFiles(Array.from(fileList), queuedFileCount, allowMultiple);

    setRejectedFiles(outcome.rejectedFiles);
    setIsChecking(false);

    if (outcome.acceptedFiles.length > 0) {
      onFilesAccepted(outcome.acceptedFiles);
    }
  }

  /** Picker path: pass the chosen files on, then clear the input value. */
  async function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    await handleSelectedFiles(event.target.files);
    // Without this, choosing the same file twice in a row would not fire a change event.
    event.target.value = "";
  }

  /** Highlights the zone while files are held over it. */
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // Required, otherwise the browser opens the file instead of dropping it.
    if (!isBlocked) setIsDragActive(true);
  }

  /** Removes the highlight only when the pointer really leaves the zone, not when it crosses a child. */
  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragActive(false);
    }
  }

  /** Drop path: stop the browser opening the file, then validate what was dropped. */
  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (isBlocked) return;
    await handleSelectedFiles(event.dataTransfer.files);
  }

  const dropZoneClassName = [
    "fileDropZone",
    isDragActive ? "fileDropZoneActive" : "",
    isBlocked ? "fileDropZoneBlocked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="fileDropZoneSection" aria-label="Add files">
      <div
        className={dropZoneClassName}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-busy={isChecking}
      >
        {/* Decorative upload icon — the text below carries the meaning. */}
        <svg
          className="fileDropZoneIcon"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>

        <p className="fileDropZoneTitle">
          {allowMultiple ? "Drop your files here" : "Drop your file here"}
        </p>

        {isChecking ? (
          // Loading state (Rule 25): shown while the first bytes of each file are read.
          <p className="fileDropZoneChecking" role="status">
            <span className="fileToolsSpinner" aria-hidden="true" />
            Checking your files…
          </p>
        ) : (
          <>
            <p className="fileDropZoneDivider">or</p>
            <button
              type="button"
              className="buttonPrimary fileDropZoneButton"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBlocked}
            >
              {allowMultiple ? "Select files" : "Select a file"}
            </button>
          </>
        )}

        <p className="fileDropZoneHint">
          JPG, PNG, WEBP, HEIC or PDF · up to {maxFileSizeMegabytes}MB each
          {allowMultiple ? ` · up to ${maxBatchFileCount} files` : ""}
        </p>

        <input
          ref={fileInputRef}
          className="fileDropZoneInput"
          type="file"
          accept={acceptedFileExtensions}
          multiple={allowMultiple}
          onChange={handleInputChange}
          disabled={isBlocked}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {rejectedFiles.length > 0 && (
        // Error state (Rule 25.4): says which files were refused and why, never a raw error.
        <div className="fileDropZoneRejections" role="alert">
          <p className="fileDropZoneRejectionsTitle">{fileToolMessages.rejectedHeading}</p>
          <ul className="fileDropZoneRejectionList">
            {rejectedFiles.map((rejectedFile, rejectedIndex) => (
              <li key={`${rejectedFile.fileName}-${rejectedIndex}`}>{rejectedFile.reason}</li>
            ))}
          </ul>
          <button
            type="button"
            className="buttonSecondary"
            onClick={() => setRejectedFiles([])}
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
}
