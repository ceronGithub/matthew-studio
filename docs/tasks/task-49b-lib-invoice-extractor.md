# task-49b — lib-invoice-extractor — pdf.js text extraction + field parsing

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §3.1 (what it extracts), §3.3 steps 2-3
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 2 of 9
**Dependency:** none
**NEEDS:** none
**SETUP:** npm install pdfjs-dist  (not in package.json as of 2026-10-03)
**FILES TO TOUCH:** lib/fileTools/invoiceExtractor.ts (new); lib/fileTools/pdfJsLoader.ts (new — shared pdf.js import + worker setup, added so task-49d reuses it without importing from the extractor); package.json, package-lock.json (dependency)
**DONE WHEN:**
- extractInvoiceFields(file) returns { invoiceNumber, date, client, status } where date is normalized to YYYY-MM-DD and status is "detected" | "partial" | "needsManualInput".
- Uses the spec's label regexes (Invoice No./#/Number, Date, first line after Bill To/Client).
- A PDF with no text layer returns status "needsManualInput" instead of throwing.
- pdf.js worker is configured so it loads under Next.js 16 client-side with no server request carrying the file.

## Scope
Client-side only. Parsing logic (regex + date normalization) kept in small exported helpers so it can be tested without a PDF. The pdf.js worker setup written here is reused by task-49d.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
