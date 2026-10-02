# task-49e — ui-file-tools-shared — drop zone, queue list, format selector, validation

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §2.2, §2.3 steps 1-3 and 6, §2.4
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 5 of 9
**Dependency:** none
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** components/fileTools/FileDropZone.tsx, components/fileTools/FileQueueList.tsx, components/fileTools/FormatSelector.tsx, lib/fileTools/fileValidation.ts, components/fileTools/FileTools.css (all new); the project's centralized errorMessages file (locate at build time; add file-tool messages)
**DONE WHEN:**
- Validation rejects: files over 25MB, batches over 50, empty files, extension/MIME mismatch — each with its own plain-English message (Rule 34.1).
- Queue list shows detected type, size and a status pill (Queued / Converting / Done / Failed) per file.
- Drop zone works by drag-and-drop and by "or select files"; keyboard focus + 44px tap targets (Rules 29/33.3).
- Loading, empty and error states present (Rule 25).

## Scope
Presentational + validation only — no conversion or extraction logic. Confirm at build time how existing components/home/* handle CSS before creating FileTools.css.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
