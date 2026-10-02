# task-49g — ui-invoice-extraction-preview — extraction hook + editable preview table

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §3.3 steps 1-3, §3.4 (non-invoice PDFs)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 7 of 9
**Dependency:** task-49b, task-49e
**NEEDS:** task-49b, task-49e
**SETUP:** none
**FILES TO TOUCH:** hooks/useInvoiceExtraction.ts, components/fileTools/InvoicePreviewTable.tsx (both new)
**DONE WHEN:**
- Hook runs extractInvoiceFields per uploaded PDF and holds the editable per-file state.
- Table shows Original name, Detected fields, New name; fields editable inline.
- "Needs manual input" rows are flagged but never block the batch.
- Non-invoice PDFs show "Not detected" and can still be named by hand.
- FIRST BROWSER RUN of pdf.js (carried over from task-49b, which could not test it): with a real invoice PDF, the pdf.js worker loads under `next dev` and `next build` with no worker or `canvas` module errors, and nothing carrying the file shows in the Network tab. Rows with dateIsAmbiguous = true are visibly highlighted.

## Scope
New-name preview uses filenameBuilder (task-49a) once wired in task-49h; until then the table renders the new-name column from a prop.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.

## Result (2026-10-03)
Built hooks/useInvoiceExtraction.ts and components/fileTools/InvoicePreviewTable.tsx. Also changed lib/errorMessages.ts (renameOnlyPdf) and app/styles/fileTools.css (table styles).
- Hook: rows with id, file name, size, rowState (waiting/reading/ready), detectionStatus and the three editable values. One reading loop, one PDF at a time; a removed row is skipped; a bad PDF only flags its own row. Exposes addFiles, updateField, removeFile, clearAll, getSourceFile (for 49h), isExtracting, progress, toasts. Non-PDFs are refused with a toast. Completion toast: success, or warning when some need manual input.
- Table: Original name (with size, status pill, "Needs manual input" flag while any field is empty), editable Invoice No., Date, Client, and a New name column fed by the optional `newFileNames` prop (dash until 49h). Empty state included. Ambiguous dates get a tinted row, an amber date field and the words "Check day and month"; editing the date clears it.
- DEVIATION (Rule 18.1): typed text strips < > { } [ ] / \ ; ' " ` = but keeps spaces and hyphens, since the full list would make "INV-0042" and client names untyped. Date uses a native date input. Values never reach HTML or a server, and filenameBuilder cleans them again.
- DEVIATION (layout): a real table that scrolls sideways inside its wrapper on phones (min-width 56rem, commented per Rule 23.3), no mediaQueries.css change.
- Type check and lint: no errors in the new files.
- NOT TESTED, and the DONE WHEN item still open: the first browser run of pdf.js with a real invoice PDF (worker loads under `next dev` and `next build`, no `canvas` error, no file in the Network tab, ambiguous date highlighted). Also check: drop a scanned/non-invoice PDF, remove a row mid-read, drop an image (toast), tab through the inputs. Carry the 49d follow-ups from openFindings (standard-font warning, merge size, 100-page cap).
- Not wired to a page yet; task-49h adds the rename workspace.
