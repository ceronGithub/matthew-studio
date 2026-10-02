# task-49c — lib-conversion-images — image format conversion

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §2.1 (Images row), §2.4 (limits)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 3 of 9
**Dependency:** none
**NEEDS:** none
**SETUP:** npm install heic2any pdf-lib  (neither in package.json as of 2026-10-03)
**FILES TO TOUCH:** lib/fileTools/conversionEngine.ts (new); package.json, package-lock.json
**DONE WHEN:**
- convertFile(file, targetFormat) handles JPG/PNG/WEBP/HEIC in to JPG/PNG/WEBP/PDF out, returning { blob, fileName }[].
- HEIC input is decoded via heic2any before the canvas step.
- Image to PDF produces a valid single-page PDF.
- Unsupported combinations return a typed failure with a human-readable reason (Rule 34.1), never a raw error object.

## Scope
Canvas for raster conversions. ASSUMPTION TO CONFIRM: the spec names pdf.js + canvas, but pdf.js can only read PDFs — Image to PDF, merge and split (task-49d) need a PDF writer, so this task adds pdf-lib. Result type is an array so per-page outputs (task-49d) fit the same shape.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
