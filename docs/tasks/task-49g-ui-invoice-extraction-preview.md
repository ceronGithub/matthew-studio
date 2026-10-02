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

## Scope
New-name preview uses filenameBuilder (task-49a) once wired in task-49h; until then the table renders the new-name column from a prop.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
