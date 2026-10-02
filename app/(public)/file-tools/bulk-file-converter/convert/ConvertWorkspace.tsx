/**
 * FILE: app/(public)/file-tools/bulk-file-converter/convert/ConvertWorkspace.tsx
 * ROLE: Public — the File Tools "Convert" workspace. No account needed.
 *
 * PURPOSE:
 * Puts the shared pieces together: drop zone, queue list, format selector,
 * Convert button, progress bar and the download area
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 2.2 and 2.3,
 * steps 4-5). All logic lives in useFileConversion; this file only draws.
 *
 * DATA FLOW:
 * 1. FileDropZone -> addFiles() puts valid files in the queue.
 * 2. FormatSelector appears once a file exists; the pick applies to the whole batch.
 * 3. "Convert" runs the hook; each row's pill and the progress bar update live.
 * 4. One converted file -> a direct download button. Two or more -> a
 *    "Download all (.zip)" button plus a link per file.
 */
"use client";

import FileDropZone from "@/components/fileTools/FileDropZone";
import FileQueueList from "@/components/fileTools/FileQueueList";
import FormatSelector from "@/components/fileTools/FormatSelector";
import ToastStack from "@/components/shared/ToastStack";
import { useFileConversion } from "@/hooks/useFileConversion";
import "../../../../styles/fileTools.css";

interface ConvertWorkspaceProps {
  /** true = bulk mode (many files); false = individual mode (one file). */
  allowMultiple?: boolean;
}

export default function ConvertWorkspace({ allowMultiple = true }: ConvertWorkspaceProps) {
  const {
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
  } = useFileConversion({ allowMultiple });

  const hasFiles = fileQueueItems.length > 0;
  // Rows that still need converting (new, or failed earlier) decide whether Convert is available.
  const pendingFileCount = fileQueueItems.filter((item) => item.status === "queued" || item.status === "failed").length;
  const hasSeveralOutputs = convertedOutputs.length > 1;

  return (
    <section className="convertWorkspace" aria-label="File converter">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="convertWorkspaceLayout">
        <FileDropZone
          onFilesAccepted={addFiles}
          queuedFileCount={fileQueueItems.length}
          allowMultiple={allowMultiple}
          isDisabled={isConverting}
        />

        {hasFiles && (
          <>
            <FileQueueList fileQueueItems={fileQueueItems} onRemoveFile={removeFile} />

            <FormatSelector
              formats={availableFormats}
              selectedFormat={selectedFormat}
              onFormatChange={setTargetFormat}
              isDisabled={isConverting}
            />

            <div className="convertActions">
              <button
                type="button"
                className="convertButton"
                onClick={startConversion}
                disabled={isConverting || pendingFileCount === 0 || !selectedFormat}
              >
                {isConverting
                  ? "Converting…"
                  : `Convert ${pendingFileCount === 1 ? "1 file" : `${pendingFileCount} files`}${selectedFormat ? ` to ${selectedFormat.toUpperCase()}` : ""}`}
              </button>
              <button type="button" className="convertSecondaryButton" onClick={clearQueue} disabled={isConverting}>
                Clear all
              </button>
            </div>

            {/* Overall progress: only while a run is going or just finished. */}
            {progress.totalCount > 0 && (
              <div className="convertProgress">
                <p className="convertProgressLabel">
                  {progress.finishedCount} of {progress.totalCount} done
                </p>
                <div
                  className="convertProgressTrack"
                  role="progressbar"
                  aria-label="Conversion progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div className="convertProgressFill" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Download area: appears when at least one file has been converted. */}
        {convertedOutputs.length > 0 && (
          <section className="convertDownloads" aria-label="Converted files">
            <h2 className="convertDownloadsTitle">
              {hasSeveralOutputs ? `${convertedOutputs.length} converted files` : "Your converted file"}
            </h2>

            {hasSeveralOutputs && (
              <button type="button" className="convertButton" onClick={downloadAllAsZip} disabled={isBuildingZip}>
                {isBuildingZip ? "Building ZIP…" : "Download all (.zip)"}
              </button>
            )}

            <ul className="convertDownloadList">
              {convertedOutputs.map((output) => (
                <li key={output.outputId} className="convertDownloadItem">
                  <span className="convertDownloadName">{output.fileName}</span>
                  <button type="button" className="convertSecondaryButton" onClick={() => downloadOutput(output)}>
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
