/**
 * FILE: hooks/useInvoiceExtraction.ts
 * ROLE: Public — File Tools "Rename PDFs" workspace (no account needed).
 *
 * PURPOSE:
 * Reads the Invoice No., Date and client name out of each uploaded PDF and holds
 * the editable per-file rows that the preview table shows
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 3.3 steps 1-3,
 * Section 3.4). It does NOT build new filenames or download anything — that is
 * task-49h. The component stays presentational (Rule 31.4).
 *
 * DATA FLOW:
 * 1. FileDropZone hands validated files to addFiles(); non-PDFs are refused with a toast.
 * 2. Each PDF becomes a "waiting" row; a single runner reads them one at a time
 *    (keeps memory low) with extractInvoiceFields(), which never throws.
 * 3. The row fills in with the detected values and its detection status.
 *    A PDF with nothing found stays editable so it can be named by hand.
 * 4. updateField() changes one value from the preview table.
 * 5. getSourceFile() lets the rename workspace read the original File later.
 * Nothing leaves the visitor's browser.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/shared/useToast";
import { fileToolMessages } from "@/lib/errorMessages";
import { extractInvoiceFields, type InvoiceExtractionStatus } from "@/lib/fileTools/invoiceExtractor";
import type { AcceptedFile } from "@/lib/fileTools/fileValidation";

/** The three values a visitor can correct in the preview table. */
export type InvoiceFieldName = "invoiceNumber" | "date" | "client";

/** waiting = queued for reading, reading = being read now, ready = shown and editable. */
export type InvoiceRowState = "waiting" | "reading" | "ready";

/** One PDF in the preview table. `id` stays stable for the life of the row. */
export interface InvoiceRow {
  id: string;
  fileName: string;
  sizeInBytes: number;
  rowState: InvoiceRowState;
  /** What the reader found. null until the row has been read. */
  detectionStatus: InvoiceExtractionStatus | null;
  /** Empty string = not found. Editable. */
  invoiceNumber: string;
  /** YYYY-MM-DD or empty string. Editable. */
  date: string;
  client: string;
  /** true = written like 03/04/2026, read month-first; the table highlights it until the visitor edits the date. */
  dateIsAmbiguous: boolean;
}

/** How many PDFs the current reading run has finished. */
export interface ExtractionProgress {
  finishedCount: number;
  totalCount: number;
}

// Characters removed from typed text (Rule 18.1). The rule's full list also removes spaces
// and hyphens, which would make "INV-0042" and "Juan dela Cruz" impossible to type; these
// values are never rendered as HTML or sent anywhere, and filenameBuilder cleans them again
// before use, so spaces and hyphens are kept.
const forbiddenTextCharacters = /[<>{}[\]/\\;'"`=]/g;

// The date input always gives YYYY-MM-DD, or an empty string when cleared.
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function useInvoiceExtraction() {
  const { toasts, showToast, dismissToast } = useToast();

  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress>({ finishedCount: 0, totalCount: 0 });

  // The real File objects live in a ref: large, never drawn, must not trigger re-renders.
  const fileByRowId = useRef<Map<string, File>>(new Map());
  // Row ids still waiting to be read, in the order they were added.
  const waitingRowIds = useRef<string[]>([]);
  // Stops a second reading loop from starting while one is running.
  const isRunnerActive = useRef(false);
  // Lets the loop stop quietly if the visitor leaves the page mid-run.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** updateRow — changes one row without touching the others. */
  const updateRow = useCallback((rowId: string, changes: Partial<InvoiceRow>) => {
    if (!isMountedRef.current) return;
    setInvoiceRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, ...changes } : row)));
  }, []);

  /**
   * runExtraction
   * The single reading loop. Takes waiting rows one at a time and reads each with
   * extractInvoiceFields(). A row removed while waiting or reading is skipped, and a
   * bad PDF only flags its own row. Ends with one toast for the whole run.
   */
  const runExtraction = useCallback(async () => {
    if (isRunnerActive.current) return;
    isRunnerActive.current = true;
    setIsExtracting(true);

    let readCount = 0;
    let needsInputCount = 0;

    while (waitingRowIds.current.length > 0) {
      const rowId = waitingRowIds.current.shift() as string;
      const sourceFile = fileByRowId.current.get(rowId);
      if (!sourceFile) continue; // Removed before its turn.

      updateRow(rowId, { rowState: "reading" });
      const result = await extractInvoiceFields(sourceFile);

      // Removed while it was being read: drop the result.
      if (!fileByRowId.current.has(rowId)) continue;

      readCount += 1;
      if (result.status === "needsManualInput") needsInputCount += 1;
      updateRow(rowId, {
        rowState: "ready",
        detectionStatus: result.status,
        invoiceNumber: result.invoiceNumber,
        date: result.date,
        client: result.client,
        dateIsAmbiguous: result.dateIsAmbiguous,
      });
      if (isMountedRef.current) {
        setProgress((current) => ({ ...current, finishedCount: current.finishedCount + 1 }));
      }
    }

    isRunnerActive.current = false;
    if (!isMountedRef.current) return;
    setIsExtracting(false);

    if (readCount === 0) return;
    if (needsInputCount === 0) {
      showToast(readCount === 1 ? "✓ 1 PDF read." : `✓ ${readCount} PDFs read.`, "success");
    } else {
      showToast(`⚠ ${readCount} PDFs read, ${needsInputCount} need manual input.`, "warning");
    }
  }, [showToast, updateRow]);

  /**
   * addFiles
   * Adds validated PDFs as rows and starts reading them. Anything that is not a PDF is
   * left out with a toast naming it (Rename mode reads PDFs only).
   */
  const addFiles = useCallback(
    (acceptedFiles: AcceptedFile[]) => {
      const pdfFiles = acceptedFiles.filter((acceptedFile) => acceptedFile.kind === "pdf");
      acceptedFiles
        .filter((acceptedFile) => acceptedFile.kind !== "pdf")
        .forEach((acceptedFile) => showToast(`✕ ${fileToolMessages.renameOnlyPdf(acceptedFile.file.name)}`, "error"));
      if (pdfFiles.length === 0) return;

      const newRows: InvoiceRow[] = pdfFiles.map(({ file }) => {
        const rowId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        fileByRowId.current.set(rowId, file);
        waitingRowIds.current.push(rowId);
        return {
          id: rowId,
          fileName: file.name,
          sizeInBytes: file.size,
          rowState: "waiting",
          detectionStatus: null,
          invoiceNumber: "",
          date: "",
          client: "",
          dateIsAmbiguous: false,
        };
      });

      setInvoiceRows((currentRows) => [...currentRows, ...newRows]);
      // A new batch counts on top of whatever is already finished.
      setProgress((current) => ({ ...current, totalCount: current.totalCount + newRows.length }));
      void runExtraction();
    },
    [runExtraction, showToast]
  );

  /**
   * updateField
   * Stores a value the visitor typed in the preview table. Text is cleaned of the
   * characters above; a date must be YYYY-MM-DD or empty. Editing the date clears
   * the "check day/month" highlight, because the visitor has now confirmed it.
   */
  const updateField = useCallback(
    (rowId: string, fieldName: InvoiceFieldName, rawValue: string) => {
      if (fieldName === "date") {
        if (rawValue !== "" && !isoDatePattern.test(rawValue)) return;
        updateRow(rowId, { date: rawValue, dateIsAmbiguous: false });
        return;
      }
      updateRow(rowId, { [fieldName]: rawValue.replace(forbiddenTextCharacters, "") });
    },
    [updateRow]
  );

  /** removeFile — drops one row and its stored file (also stops it being read if still waiting). */
  const removeFile = useCallback((rowId: string) => {
    fileByRowId.current.delete(rowId);
    waitingRowIds.current = waitingRowIds.current.filter((waitingId) => waitingId !== rowId);
    setInvoiceRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
  }, []);

  /** clearAll — empties everything so the visitor can start a new batch. */
  const clearAll = useCallback(() => {
    fileByRowId.current.clear();
    waitingRowIds.current = [];
    setInvoiceRows([]);
    setProgress({ finishedCount: 0, totalCount: 0 });
  }, []);

  /** getSourceFile — the original File for a row; used by the rename workspace (task-49h). */
  const getSourceFile = useCallback((rowId: string): File | undefined => fileByRowId.current.get(rowId), []);

  return {
    invoiceRows,
    isExtracting,
    progress,
    addFiles,
    updateField,
    removeFile,
    clearAll,
    getSourceFile,
    toasts,
    showToast,
    dismissToast,
  };
}
