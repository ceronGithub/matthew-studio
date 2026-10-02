# task-49d — lib-conversion-pdf-utils — PDF to image/text, merge, split

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §2.1 (PDF utilities row; PDF to TXT from Documents row)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 4 of 9
**Dependency:** task-49b (pdf.js installed + worker config), task-49c (conversionEngine.ts exists)
**NEEDS:** task-49b, task-49c
**SETUP:** none
**FILES TO TOUCH:** lib/fileTools/conversionEngine.ts (modify)
**DONE WHEN:**
- PDF to JPG/PNG returns one { blob, fileName } per page.
- PDF to TXT returns the extracted text layer as one .txt.
- mergePdfs(files[]) returns one PDF in the given order; splitPdf(file) returns one PDF per page.
- Result shape matches task-49c's so the hook (task-49f) treats every conversion the same.

## Scope
Extends the same file as task-49c. Merge is a batch-level operation (takes all queued PDFs), unlike the per-file conversions — expose it as a separate function, not a convertFile branch. DOCX in/out is NOT in v1.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
