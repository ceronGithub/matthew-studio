/**
 * FILE: hooks/useFileConversion.ts
 * ROLE: Public — File Tools "Convert" workspace (no account needed).
 *
 * PURPOSE:
 * Owns everything the Convert workspace does besides drawing it: the queue of
 * files, the chosen output format, running conversionEngine one file at a time,
 * per-file status, overall progress, the converted files, and the ZIP download
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 2.2 and 2.3,
 * steps 4-5). The component stays presentational (Rule 31.4).
 *
 * DATA FLOW:
 * 1. FileDropZone hands validated files to addFiles(); each becomes a "queued" row.
 * 2. The visitor picks one target format for the whole batch (setTargetFormat).
 * 3. startConversion() runs convertFile() on each queued/failed row in turn.
 *    A failed row gets its reason; the loop always continues to the next file.
 * 4. Converted files are kept in memory in `convertedOutputs` and downloaded by
 *    downloadOutput() (one file) or downloadAllAsZip() (several files).
 * 5. A toast reports the result once the run ends (Rule 22).
 * Nothing leaves the visitor's browser.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileQueueItem } from "@/components/fileTools/FileQueueList";
import { useToast } from "@/components/shared/useToast";
import { saveBlobToDevice } from "@/lib/fileTools/downloadBlob";
import { fileToolMessages } from "@/lib/errorMessages";
import {
  convertFile,
  imageTargetFormats,
  pdfTargetFormats,
  type ConvertedFile,
} from "@/lib/fileTools/conversionEngine";
import type { AcceptedFile } from "@/lib/fileTools/fileValidation";

/** One converted file, linked back to the queue row it came from. */
export interface ConvertedOutput extends ConvertedFile {
  /** Unique per output (a PDF turned into JPGs makes one output per page). */
  outputId: string;
  /** The queue row (FileQueueItem.id) this file was made from. */
  sourceItemId: string;
}

/** How far the current run has got. */
export interface ConversionProgress {
  finishedCount: number;
  totalCount: number;
  /** 0-100, rounded. */
  percent: number;
}

interface UseFileConversionOptions {
  /** true = bulk mode (many files); false = individual mode (one file at a time). */
  allowMultiple?: boolean;
}

/** Source of truth for the output formats each kind of file can become (engine lists). */
const targetFormatsByKind = {
  image: imageTargetFormats as readonly string[],
  pdf: pdfTargetFormats as readonly string[],
};

/**
 * makeUniqueFileName
 * Two inputs such as "photo.png" and "photo.jpg" would both become "photo.pdf",
 * and a ZIP cannot hold two files with one name. Adds " (2)", " (3)" ... before
 * the extension when a name is already taken.
 */
function makeUniqueFileName(fileName: string, namesAlreadyUsed: Set<string>): string {
  if (!namesAlreadyUsed.has(fileName)) {
    namesAlreadyUsed.add(fileName);
    return fileName;
  }
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
  let copyNumber = 2;
  while (namesAlreadyUsed.has(`${baseName} (${copyNumber})${extension}`)) copyNumber += 1;
  const uniqueName = `${baseName} (${copyNumber})${extension}`;
  namesAlreadyUsed.add(uniqueName);
  return uniqueName;
}

export function useFileConversion({ allowMultiple = true }: UseFileConversionOptions = {}) {
  const { toasts, showToast, dismissToast } = useToast();

  const [fileQueueItems, setFileQueueItems] = useState<FileQueueItem[]>([]);
  const [convertedOutputs, setConvertedOutputs] = useState<ConvertedOutput[]>([]);
  const [chosenFormat, setChosenFormat] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress>({ finishedCount: 0, totalCount: 0, percent: 0 });

  // The real File objects live in a ref: they are large, never drawn, and must not trigger re-renders.
  const fileByItemId = useRef<Map<string, File>>(new Map());
  // Lets a conversion loop stop quietly if the visitor leaves the page mid-run.
  const isMountedRef = useRef(true);
  // Mirrors isConverting so a double click cannot start a second run before React re-renders.
  const isRunningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * availableFormats
   * The output formats that work for EVERY queued file. All images -> JPG, PNG,
   * WEBP, PDF; all PDFs -> JPG, PNG, TXT; a mix -> only what both share (JPG, PNG).
   * Empty while the queue is empty, which is how the parent hides the selector.
   */
  const availableFormats = useMemo<readonly string[]>(() => {
    if (fileQueueItems.length === 0) return [];
    return fileQueueItems.reduce<readonly string[]>((formatsSoFar, item, index) => {
      const formatsForThisFile = item.kind === "pdf" ? targetFormatsByKind.pdf : targetFormatsByKind.image;
      return index === 0 ? formatsForThisFile : formatsSoFar.filter((format) => formatsForThisFile.includes(format));
    }, []);
  }, [fileQueueItems]);

  // The visitor's pick, or the first valid format if their pick no longer applies (e.g. a PDF was added).
  const selectedFormat = availableFormats.includes(chosenFormat) ? chosenFormat : (availableFormats[0] ?? "");

  /**
   * resetResults
   * Puts every row back to "queued" and drops the converted files. Used when the
   * target format changes, because the old results no longer match the choice.
   */
  const resetResults = useCallback(() => {
    setConvertedOutputs([]);
    setProgress({ finishedCount: 0, totalCount: 0, percent: 0 });
    setFileQueueItems((currentItems) =>
      currentItems.map((item) => ({ ...item, status: "queued" as const, failureReason: undefined }))
    );
  }, []);

  /** setTargetFormat — stores the pick and invalidates results made with the old format. */
  const setTargetFormat = useCallback(
    (format: string) => {
      if (isRunningRef.current || format === selectedFormat) return;
      setChosenFormat(format);
      resetResults();
    },
    [resetResults, selectedFormat]
  );

  /**
   * addFiles
   * Turns validated files into queued rows. Individual mode keeps only one file,
   * so a new file replaces the old one; bulk mode appends.
   */
  const addFiles = useCallback(
    (acceptedFiles: AcceptedFile[]) => {
      if (isRunningRef.current || acceptedFiles.length === 0) return;

      // Individual mode holds one file, so only the newest accepted file is used and it replaces the old one.
      const filesToAdd = allowMultiple ? acceptedFiles : acceptedFiles.slice(-1);
      if (!allowMultiple) fileByItemId.current.clear();

      const newItems: FileQueueItem[] = filesToAdd.map(({ file, kind }) => {
        const itemId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        fileByItemId.current.set(itemId, file);
        return { id: itemId, fileName: file.name, sizeInBytes: file.size, kind, status: "queued" };
      });

      setFileQueueItems((currentItems) => (allowMultiple ? [...currentItems, ...newItems] : newItems));
      // Bulk mode keeps earlier results (those rows stay "done"); individual mode replaced the file, so its result is cleared.
      if (!allowMultiple) {
        setConvertedOutputs([]);
        setProgress({ finishedCount: 0, totalCount: 0, percent: 0 });
      }
    },
    [allowMultiple]
  );

  /** removeFile — drops one row, its stored file and anything converted from it. */
  const removeFile = useCallback((fileId: string) => {
    if (isRunningRef.current) return;
    fileByItemId.current.delete(fileId);
    setFileQueueItems((currentItems) => currentItems.filter((item) => item.id !== fileId));
    setConvertedOutputs((currentOutputs) => currentOutputs.filter((output) => output.sourceItemId !== fileId));
  }, []);

  /** clearQueue — empties everything so the visitor can start a new batch. */
  const clearQueue = useCallback(() => {
    if (isRunningRef.current) return;
    fileByItemId.current.clear();
    setFileQueueItems([]);
    setConvertedOutputs([]);
    setProgress({ finishedCount: 0, totalCount: 0, percent: 0 });
  }, []);

  /** updateItem — changes one row's status/reason without touching the others. */
  const updateItem = useCallback((itemId: string, changes: Partial<FileQueueItem>) => {
    if (!isMountedRef.current) return;
    setFileQueueItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
    );
  }, []);

  /**
   * startConversion
   * Converts every row that is still "queued" or earlier "failed" (so pressing
   * Convert again retries failures), one at a time to keep memory use low. One
   * failed file never stops the rest: its reason is shown on its own row and the
   * loop moves on. Ends with a toast summarising the run.
   */
  const startConversion = useCallback(async () => {
    if (isRunningRef.current) return;

    const rowsToConvert = fileQueueItems.filter((item) => item.status === "queued" || item.status === "failed");
    if (rowsToConvert.length === 0 || !selectedFormat) {
      showToast(`✕ ${fileToolMessages.nothingToConvert}`, "error");
      return;
    }

    isRunningRef.current = true;
    setIsConverting(true);
    setProgress({ finishedCount: 0, totalCount: rowsToConvert.length, percent: 0 });

    let succeededCount = 0;
    let failedCount = 0;

    for (let rowIndex = 0; rowIndex < rowsToConvert.length; rowIndex += 1) {
      const row = rowsToConvert[rowIndex];
      const sourceFile = fileByItemId.current.get(row.id);

      // A row whose file was removed mid-run is skipped rather than crashing the loop.
      if (!sourceFile) continue;

      updateItem(row.id, { status: "converting", failureReason: undefined });

      try {
        const result = await convertFile(sourceFile, selectedFormat);

        if (result.ok) {
          succeededCount += 1;
          const outputsForRow: ConvertedOutput[] = result.files.map((convertedFile, fileIndex) => ({
            ...convertedFile,
            outputId: `${row.id}-${fileIndex}`,
            sourceItemId: row.id,
          }));
          if (isMountedRef.current) {
            // Replace any older outputs for this row (a retry), then add the new ones.
            setConvertedOutputs((currentOutputs) => [
              ...currentOutputs.filter((output) => output.sourceItemId !== row.id),
              ...outputsForRow,
            ]);
          }
          updateItem(row.id, { status: "done" });
        } else {
          failedCount += 1;
          updateItem(row.id, { status: "failed", failureReason: result.reason });
        }
      } catch {
        // The engine promises not to throw; this only guards against the unexpected so the batch continues.
        failedCount += 1;
        updateItem(row.id, { status: "failed", failureReason: fileToolMessages.conversionUnexpected(row.fileName) });
      }

      if (isMountedRef.current) {
        const finishedCount = rowIndex + 1;
        setProgress({
          finishedCount,
          totalCount: rowsToConvert.length,
          percent: Math.round((finishedCount / rowsToConvert.length) * 100),
        });
      }
    }

    isRunningRef.current = false;
    if (!isMountedRef.current) return;
    setIsConverting(false);

    // Completion toast: success when all worked, warning for a mix, error when none did.
    if (failedCount === 0) {
      showToast(
        succeededCount === 1 ? "✓ 1 file converted." : `✓ ${succeededCount} files converted.`,
        "success"
      );
    } else if (succeededCount === 0) {
      showToast("✕ No files could be converted. Check the reasons in the list.", "error");
    } else {
      showToast(`⚠ ${succeededCount} converted, ${failedCount} failed. Check the list below.`, "warning");
    }
  }, [fileQueueItems, selectedFormat, showToast, updateItem]);

  /** downloadOutput — saves one converted file to the visitor's device. */
  const downloadOutput = useCallback((output: ConvertedOutput) => {
    saveBlobToDevice(output.blob, output.fileName);
  }, []);

  /**
   * downloadAllAsZip
   * Packs every converted file into one ZIP and downloads it. jszip is loaded
   * only now, so visitors who convert a single file never download it.
   */
  const downloadAllAsZip = useCallback(async () => {
    if (convertedOutputs.length === 0 || isBuildingZip) return;
    setIsBuildingZip(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zipArchive = new JSZip();
      const namesAlreadyUsed = new Set<string>();
      convertedOutputs.forEach((output) => {
        zipArchive.file(makeUniqueFileName(output.fileName, namesAlreadyUsed), output.blob);
      });
      const zipBlob = await zipArchive.generateAsync({ type: "blob" });
      saveBlobToDevice(zipBlob, "converted-files.zip");
      showToast("✓ ZIP downloaded.", "success");
    } catch {
      showToast(`✕ ${fileToolMessages.zipFailed}`, "error");
    } finally {
      if (isMountedRef.current) setIsBuildingZip(false);
    }
  }, [convertedOutputs, isBuildingZip, showToast]);

  return {
    fileQueueItems,
    convertedOutputs,
    availableFormats,
    selectedFormat,
    setTargetFormat,
    addFiles,
    removeFile,
    clearQueue,
    startConversion,
    downloadOutput,
    downloadAllAsZip,
    isConverting,
    isBuildingZip,
    progress,
    toasts,
    dismissToast,
  };
}
