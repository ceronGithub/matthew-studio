# task-49c — lib-conversion-images — image format conversion

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §2.1 (Images row), §2.4 (limits)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 3 of 9
**Dependency:** none
**NEEDS:** none
**SETUP:** none — heic2any ^0.0.4 and pdf-lib ^1.17.1 were already in package.json and package-lock.json when this task started (checked 2026-10-03); `npm install` only.
**FILES TO TOUCH:** lib/fileTools/conversionEngine.ts (new); package.json, package-lock.json (no change needed)
**DONE WHEN:**
- convertFile(file, targetFormat) handles JPG/PNG/WEBP/HEIC in to JPG/PNG/WEBP/PDF out, returning { blob, fileName }[].
- HEIC input is decoded via heic2any before the canvas step.
- Image to PDF produces a valid single-page PDF.
- Unsupported combinations return a typed failure with a human-readable reason (Rule 34.1), never a raw error object.

## Scope
Canvas for raster conversions. ASSUMPTION TO CONFIRM: the spec names pdf.js + canvas, but pdf.js can only read PDFs — Image to PDF, merge and split (task-49d) need a PDF writer, so this task adds pdf-lib. Result type is an array so per-page outputs (task-49d) fit the same shape.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.

## Result (2026-10-03)
Built lib/fileTools/conversionEngine.ts. Exports `convertFile(file, targetFormat)` returning `{ ok: true, files: { blob, fileName }[] }` or `{ ok: false, code, reason }`, plus `maxFileSizeBytes`, `maxBatchFileCount`, `imageTargetFormats`, `isImageTargetFormat`, `detectImageFormatFromBytes` for later tasks.
- File type is read from the first bytes and must agree with the extension (spec 2.4); empty files and files over 25MB are refused.
- Image to PDF always goes through the canvas, so phone-photo rotation is applied; PNG sources stay PNG inside the PDF, others become JPEG. The page is shaped like the picture and fitted inside A4.
- Decisions made without asking: a HEIC with several images converts only the first; transparent areas become white in JPG and PDF; a browser that cannot save WEBP returns a typed failure instead of a PNG named .webp.
- Tested in Node (40 cases, throwaway script not kept) with a canvas stand-in, real pdf-lib (output re-opened, 1 page, A4 fit), and a MOCKED heic2any. Not tested: the real heic2any decoder and real browser canvas/rotation. Check both in task-49f's first browser run.
