/**
 * FILE: components/fileTools/InvoicePreviewTable.tsx
 * ROLE: Public — File Tools "Rename PDFs" workspace.
 *
 * PURPOSE:
 * Shows one row per uploaded PDF: Original name, Detected fields (Invoice No.,
 * Date, Client — each editable in place) and New name
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 3.3 steps 1-3,
 * Section 3.4). A row where nothing was found says "Not detected" and can still
 * be filled in by hand. A row with an empty field is flagged "Needs manual input"
 * but never blocks the batch. A date read as day/month-ambiguous is highlighted.
 * Presentational only: the parent owns the rows (hooks/useInvoiceExtraction.ts).
 *
 * DATA FLOW:
 * 1. Parent passes `invoiceRows` and, optionally, `newFileNames` (row id -> name).
 *    Until task-49h passes names, the New name column shows a dash.
 * 2. Typing in a field calls onFieldChange(rowId, field, value).
 * 3. "Remove" calls onRemoveRow(rowId).
 */
"use client";

import type { InvoiceFieldName, InvoiceRow } from "@/hooks/useInvoiceExtraction";
import { formatFileSize } from "@/lib/fileTools/fileValidation";
import "../../app/styles/fileTools.css";

interface InvoicePreviewTableProps {
  invoiceRows: InvoiceRow[];
  /** Preview of each row's new filename, keyed by row id. Omit until names are built (task-49h). */
  newFileNames?: Record<string, string>;
  onFieldChange: (rowId: string, fieldName: InvoiceFieldName, value: string) => void;
  onRemoveRow?: (rowId: string) => void;
  /** Blocks edits and removal, e.g. while the final rename runs. */
  isDisabled?: boolean;
}

// Wording for the detection pill. The word is always shown, so colour is never the only signal.
const detectionLabels = {
  detected: "Detected",
  partial: "Partly detected",
  needsManualInput: "Not detected",
} as const;

// Empty-state sentence shown before any PDF is added (Rule 25.3).
const emptyRowMessage = "No PDFs yet. Drop your invoices above or choose them from your device.";

export default function InvoicePreviewTable({
  invoiceRows,
  newFileNames,
  onFieldChange,
  onRemoveRow,
  isDisabled = false,
}: InvoicePreviewTableProps) {
  // Empty state (Rule 25.3).
  if (invoiceRows.length === 0) {
    return (
      <section className="invoicePreviewSection" aria-label="Invoice preview">
        <p className="invoicePreviewEmpty">{emptyRowMessage}</p>
      </section>
    );
  }

  return (
    <section className="invoicePreviewSection" aria-label="Invoice preview">
      {/* Scrolls sideways on phones so the table keeps its columns (Rule 23.8). */}
      <div className="invoicePreviewScroll" tabIndex={0} role="region" aria-label="Invoice table, scrolls sideways on small screens">
        <table className="invoicePreviewTable">
          <thead>
            <tr>
              <th scope="col">Original name</th>
              <th scope="col">Invoice No.</th>
              <th scope="col">Date</th>
              <th scope="col">Client</th>
              <th scope="col">New name</th>
              {onRemoveRow && <th scope="col">Remove</th>}
            </tr>
          </thead>
          <tbody>
            {invoiceRows.map((row) => {
              const isReading = row.rowState !== "ready";
              // Flag shown while any of the three values is empty, so the visitor knows what is left to fill.
              const hasMissingField = !row.invoiceNumber || !row.date || !row.client;
              return (
                <tr
                  key={row.id}
                  className={row.dateIsAmbiguous ? "invoicePreviewRow invoicePreviewRowAmbiguous" : "invoicePreviewRow"}
                >
                  <td className="invoicePreviewNameCell">
                    <span className="invoicePreviewFileName">{row.fileName}</span>
                    <span className="invoicePreviewFileMeta">{formatFileSize(row.sizeInBytes)}</span>
                    {isReading ? (
                      <span className="fileQueueStatusPill fileQueueStatus_converting">
                        {row.rowState === "reading" ? "Reading…" : "Waiting"}
                      </span>
                    ) : (
                      <span
                        className={`fileQueueStatusPill ${
                          row.detectionStatus === "detected" ? "fileQueueStatus_done" : "fileQueueStatus_failed"
                        }`}
                      >
                        {detectionLabels[row.detectionStatus ?? "needsManualInput"]}
                      </span>
                    )}
                    {!isReading && hasMissingField && (
                      <span className="invoicePreviewFlag">Needs manual input</span>
                    )}
                  </td>

                  <td>
                    <input
                      type="text"
                      className="invoicePreviewInput"
                      value={row.invoiceNumber}
                      onChange={(event) => onFieldChange(row.id, "invoiceNumber", event.target.value)}
                      disabled={isDisabled || isReading}
                      aria-label={`Invoice number for ${row.fileName}`}
                      placeholder={isReading ? "" : "Not found"}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      className="invoicePreviewInput"
                      value={row.date}
                      onChange={(event) => onFieldChange(row.id, "date", event.target.value)}
                      disabled={isDisabled || isReading}
                      aria-label={`Date for ${row.fileName}`}
                    />
                    {/* Text next to the highlight so the warning does not rely on colour alone. */}
                    {row.dateIsAmbiguous && (
                      <span className="invoicePreviewWarning" role="note">
                        Check day and month
                      </span>
                    )}
                  </td>

                  <td>
                    <input
                      type="text"
                      className="invoicePreviewInput"
                      value={row.client}
                      onChange={(event) => onFieldChange(row.id, "client", event.target.value)}
                      disabled={isDisabled || isReading}
                      aria-label={`Client for ${row.fileName}`}
                      placeholder={isReading ? "" : "Not found"}
                    />
                  </td>

                  <td className="invoicePreviewNewName">{newFileNames?.[row.id] ?? "—"}</td>

                  {onRemoveRow && (
                    <td>
                      <button
                        type="button"
                        className="convertSecondaryButton"
                        onClick={() => onRemoveRow(row.id)}
                        disabled={isDisabled || row.rowState === "reading"}
                        aria-label={`Remove ${row.fileName}`}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
