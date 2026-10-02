/**
 * FILE: hooks/useInvoiceRename.ts
 * ROLE: Public — File Tools "Rename PDFs" workspace (no account needed).
 *
 * PURPOSE:
 * Holds the rename pattern, works out each row's new filename, and runs
 * "Rename & Download" (bulk_file_converter_and_pdf_renamer_specification.md
 * Section 3.2, Section 3.3 steps 4-5, Section 3.4). It reads the rows made by
 * useInvoiceExtraction and never changes them. The pattern lives in memory
 * only (no saving in v1).
 *
 * DATA FLOW:
 * 1. The visitor edits the pattern (setPattern / insertToken / resetPattern).
 * 2. newFileNames is rebuilt from the rows: buildFilename() per row, then
 *    dedupeFilenames() so repeats become -2, -3.
 * 3. renameAndDownload() skips rows the pattern cannot name (every token used is
 *    empty): 1 file downloads under its new name, 2+ go into one ZIP.
 * 4. A toast reports how many were renamed and how many need manual input.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import type { InvoiceRow } from "@/hooks/useInvoiceExtraction";
import type { ToastType } from "@/components/shared/useToast";
import { fileToolMessages } from "@/lib/errorMessages";
import { saveBlobToDevice } from "@/lib/fileTools/downloadBlob";
import {
  buildFilename,
  dedupeFilenames,
  defaultRenamePattern,
  sanitizeFilenamePart,
  type FilenameTokens,
} from "@/lib/fileTools/filenameBuilder";

/** The three tokens a pattern can use (Section 3.2). */
export const renameTokens = ["{invoiceNumber}", "{date}", "{client}"] as const;

// Removed from the typed pattern (Rule 18.1). The rule's full list also removes braces, spaces,
// hyphens and dots, which a pattern like "Invoice-{invoiceNumber}-{date}.pdf" needs, so those are kept.
// The pattern is never rendered as HTML or sent anywhere, and buildFilename() cleans every name again.
const forbiddenPatternCharacters = /[<>[\]/\\;'"`=]/g;

interface UseInvoiceRenameOptions {
  invoiceRows: InvoiceRow[];
  getSourceFile: (rowId: string) => File | undefined;
  showToast: (message: string, type?: ToastType) => void;
}

/**
 * withPdfExtension
 * Pattern text without ".pdf" at the end would download files with no extension,
 * so ".pdf" is added when it is missing.
 */
function withPdfExtension(pattern: string): string {
  return /\.pdf$/i.test(pattern.trim()) ? pattern.trim() : `${pattern.trim()}.pdf`;
}

/** getTokensForRow — the three editable values of a row, in the shape the builder expects. */
function getTokensForRow(row: InvoiceRow): FilenameTokens {
  return { invoiceNumber: row.invoiceNumber, date: row.date, client: row.client };
}

export function useInvoiceRename({ invoiceRows, getSourceFile, showToast }: UseInvoiceRenameOptions) {
  const [pattern, setPatternState] = useState(defaultRenamePattern);
  const [isRenaming, setIsRenaming] = useState(false);

  const effectivePattern = useMemo(() => withPdfExtension(pattern), [pattern]);

  // Token names the pattern actually uses, e.g. ["invoiceNumber", "date"].
  const usedTokenNames = useMemo(
    () => Array.from(effectivePattern.matchAll(/\{(\w+)\}/g)).map((match) => match[1]),
    [effectivePattern]
  );
  const patternHasToken = usedTokenNames.length > 0;

  /**
   * canNameRow
   * A row can be named when at least one token the pattern uses has a value.
   * Otherwise the name would come out as "unnamed.pdf", so the row is left for
   * the visitor to fill in instead.
   */
  const canNameRow = useCallback(
    (row: InvoiceRow) => {
      const tokens = getTokensForRow(row);
      return usedTokenNames.some((tokenName) => sanitizeFilenamePart(tokens[tokenName as keyof FilenameTokens] ?? "") !== "");
    },
    [usedTokenNames]
  );

  /**
   * newFileNames
   * Row id -> new filename, for rows that are read and can be named. Repeats are
   * suffixed -2, -3 across the whole batch (Section 3.3).
   */
  const newFileNames = useMemo<Record<string, string>>(() => {
    const nameableRows = invoiceRows.filter((row) => row.rowState === "ready" && canNameRow(row));
    const builtNames = nameableRows.map((row) => buildFilename(effectivePattern, getTokensForRow(row)));
    const uniqueNames = dedupeFilenames(builtNames);
    return Object.fromEntries(nameableRows.map((row, rowIndex) => [row.id, uniqueNames[rowIndex]]));
  }, [invoiceRows, effectivePattern, canNameRow]);

  const renamableCount = Object.keys(newFileNames).length;
  const isAnyRowBeingRead = invoiceRows.some((row) => row.rowState !== "ready");

  /** setPattern — stores typed text after removing the characters above. */
  const setPattern = useCallback((rawPattern: string) => {
    setPatternState(rawPattern.replace(forbiddenPatternCharacters, ""));
  }, []);

  /** insertToken — adds a token to the end of the pattern's name part, before ".pdf" if present. */
  const insertToken = useCallback((token: string) => {
    setPatternState((current) => {
      const hasExtension = /\.pdf$/i.test(current);
      const namePart = hasExtension ? current.slice(0, -4) : current;
      const separator = namePart === "" || /[-_ ]$/.test(namePart) ? "" : "-";
      return `${namePart}${separator}${token}${hasExtension ? ".pdf" : ""}`;
    });
  }, []);

  /** resetPattern — back to the default pattern from the spec. */
  const resetPattern = useCallback(() => setPatternState(defaultRenamePattern), []);

  /**
   * renameAndDownload
   * Downloads every nameable row under its new name: one file directly, several as
   * one ZIP. Rows that cannot be named are left out and counted in the toast.
   * jszip is loaded only when a ZIP is needed.
   */
  const renameAndDownload = useCallback(async () => {
    if (isRenaming) return;

    const rowsToRename = invoiceRows.filter((row) => newFileNames[row.id] !== undefined);
    const needsInputCount = invoiceRows.filter((row) => row.rowState === "ready" && newFileNames[row.id] === undefined).length;

    if (rowsToRename.length === 0) {
      showToast(`✕ ${fileToolMessages.nothingToRename}`, "error");
      return;
    }

    setIsRenaming(true);
    try {
      if (rowsToRename.length === 1) {
        const sourceFile = getSourceFile(rowsToRename[0].id);
        if (!sourceFile) throw new Error("missing file");
        saveBlobToDevice(sourceFile, newFileNames[rowsToRename[0].id]);
      } else {
        const { default: JSZip } = await import("jszip");
        const zipArchive = new JSZip();
        rowsToRename.forEach((row) => {
          const sourceFile = getSourceFile(row.id);
          if (sourceFile) zipArchive.file(newFileNames[row.id], sourceFile);
        });
        const zipBlob = await zipArchive.generateAsync({ type: "blob" });
        saveBlobToDevice(zipBlob, "renamed-invoices.zip");
      }

      const renamedText = rowsToRename.length === 1 ? "1 file" : `${rowsToRename.length} files`;
      if (needsInputCount === 0) {
        showToast(`✓ ${renamedText} renamed and downloaded.`, "success");
      } else {
        showToast(`⚠ ${rowsToRename.length} renamed, ${needsInputCount} needs manual input.`, "warning");
      }
    } catch {
      showToast(`✕ ${fileToolMessages.zipFailed}`, "error");
    } finally {
      setIsRenaming(false);
    }
  }, [getSourceFile, invoiceRows, isRenaming, newFileNames, showToast]);

  return {
    pattern,
    setPattern,
    insertToken,
    resetPattern,
    patternHasToken,
    newFileNames,
    renamableCount,
    isAnyRowBeingRead,
    isRenaming,
    renameAndDownload,
  };
}
