/**
 * FILE: app/(public)/file-tools/bulk-file-converter/rename/InvoiceRenameWorkspace.tsx
 * ROLE: Public — the File Tools "Rename PDFs" workspace. No account needed.
 *
 * PURPOSE:
 * Puts the Rename pieces together: drop zone, pattern builder, editable preview
 * table and the "Rename & Download" button
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 3.2-3.4). All
 * logic lives in useInvoiceExtraction (reading the PDFs) and useInvoiceRename
 * (pattern, new names, download); this file only draws.
 *
 * DATA FLOW:
 * 1. FileDropZone -> addFiles() reads each PDF; the table fills in as they finish.
 * 2. The visitor adjusts the pattern and any detail; new names update live.
 * 3. "Rename & Download": 1 file downloads directly, 2+ as a ZIP.
 */
"use client";

import FileDropZone from "@/components/fileTools/FileDropZone";
import InvoicePreviewTable from "@/components/fileTools/InvoicePreviewTable";
import RenamePatternBuilder from "@/components/fileTools/RenamePatternBuilder";
import ToastStack from "@/components/shared/ToastStack";
import { useInvoiceExtraction } from "@/hooks/useInvoiceExtraction";
import { renameTokens, useInvoiceRename } from "@/hooks/useInvoiceRename";
import "../../../../styles/fileTools.css";

export default function InvoiceRenameWorkspace() {
  const {
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
  } = useInvoiceExtraction();

  const {
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
  } = useInvoiceRename({ invoiceRows, getSourceFile, showToast });

  const hasRows = invoiceRows.length > 0;

  return (
    <section className="convertWorkspace" aria-label="PDF invoice renamer">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="convertWorkspaceLayout">
        <FileDropZone onFilesAccepted={addFiles} queuedFileCount={invoiceRows.length} allowMultiple isDisabled={isRenaming} />

        <RenamePatternBuilder
          pattern={pattern}
          tokens={renameTokens}
          patternHasToken={patternHasToken}
          onPatternChange={setPattern}
          onInsertToken={insertToken}
          onReset={resetPattern}
          isDisabled={isRenaming}
        />

        <InvoicePreviewTable
          invoiceRows={invoiceRows}
          newFileNames={newFileNames}
          onFieldChange={updateField}
          onRemoveRow={removeFile}
          isDisabled={isRenaming}
        />

        {hasRows && (
          <div className="convertActions">
            <button
              type="button"
              className="convertButton"
              onClick={renameAndDownload}
              disabled={isRenaming || isAnyRowBeingRead || !patternHasToken}
            >
              {isRenaming ? "Preparing…" : "Rename & Download"}
            </button>
            <button type="button" className="convertSecondaryButton" onClick={clearAll} disabled={isRenaming}>
              Clear all
            </button>
            {isExtracting && (
              <p className="convertProgressLabel" aria-live="polite">
                Reading {progress.finishedCount} of {progress.totalCount}…
              </p>
            )}
            {!isExtracting && (
              <p className="convertProgressLabel">
                {renamableCount === 1 ? "1 file ready to rename." : `${renamableCount} files ready to rename.`}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
