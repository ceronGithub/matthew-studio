# task-49a — lib-filename-builder — pattern to sanitized filename

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §3.2 (rename pattern), §3.4 (edge cases)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 1 of 9
**Dependency:** none
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** lib/fileTools/filenameBuilder.ts (new)
**DONE WHEN:**
- buildFilename("Invoice-{invoiceNumber}-{date}.pdf", fields) returns "Invoice-INV-2026-0142-2026-08-15.pdf" for the spec's example.
- Characters invalid in filenames (/ \ : * ? " < > |) are stripped from every token value.
- dedupeFilenames(names[]) suffixes repeats -2, -3 before the extension.
- A missing/empty token drops its segment and collapses doubled hyphens (assumption — spec silent; confirm if you want a placeholder like "unknown").

## Scope
Pure functions only, no React, no DOM. Tokens: {invoiceNumber}, {date}, {client}. Keep the raw (unsanitized) value available to the caller — the preview table (task-49g) shows raw and sanitized side by side.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
