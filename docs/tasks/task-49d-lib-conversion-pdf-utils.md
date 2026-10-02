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

## Result (2026-10-03)
Extended lib/fileTools/conversionEngine.ts. `convertFile` now also takes a PDF: JPG/PNG returns one file per page (`<name>-page-01.jpg`, numbers padded), TXT returns one .txt. New exports `mergePdfs(files)` (needs 2+, returns `merged.pdf`), `splitPdf(file)` (one PDF per page), `pdfTargetFormats`, `isPdfTargetFormat`. Same `{ ok, files }` / typed-failure shape as 49c; new failure codes `passwordProtected`, `tooManyPages`, `noTextFound`, `notEnoughFiles`.
- PDF type is read from the first bytes and must agree with the extension, same as images. PDF to PDF/WEBP and image to TXT are refused with `unsupportedTarget`.
- Pages are drawn at 2x (about 144 dpi) on a white background, shrunk if a page would pass the 100M-pixel canvas limit. All-or-nothing: one failed page returns no files.
- TXT reuses `extractTextLinesFromDocument` from 49b. A scan with no text layer returns `noTextFound` (no OCR in v1). Known limit: no page-break markers in the .txt.
- ASSUMPTION TO CONFIRM: `maxPdfPages = 100` for page-by-page outputs (images, split) — the spec gives no page limit; chosen to protect phone memory.
- Tested in Node (27 cases): real pdf-lib for merge/split (order, page counts, padding, damaged/empty/wrong-extension files, 101-page refusal); real pdf.js for PDF to TXT, scan, damaged file; real pdf.js + a Node canvas stand-in for PDF to JPG/PNG (12 pages, 300x400 pt page -> 600x800 px, correct file signatures). Throwaway scripts not kept. Not tested: real browser canvas and the pdf.js worker via the bundler (carry to task-49f's first browser run), password-protected PDFs (no sample file).
