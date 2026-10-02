# task-49f — ui-convert-workspace — Feature A hook + workspace

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §2.2 (individual + bulk modes), §2.3 steps 4-5
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 6 of 9
**Dependency:** task-49c, task-49d, task-49e
**NEEDS:** task-49c, task-49d, task-49e
**SETUP:** npm install jszip  (not in package.json as of 2026-10-03)
**FILES TO TOUCH:** hooks/useFileConversion.ts, app/(public)/file-tools/bulk-file-converter/convert/ConvertWorkspace.tsx (both new); package.json, package-lock.json
**DONE WHEN:**
- Hook queues files, runs conversionEngine, tracks per-file and overall progress, exposes status per file.
- 1 file converted: direct download. 2+ files: "Download all (.zip)" plus individual links.
- One failed file never blocks the rest; its reason shows inline.
- Toast on completion via the project's shared toast hook (locate at build time — Rule 22).

## Scope
All conversion calls go through the hook; the component stays presentational (Rule 31.4). Target format applies to the whole batch (spec §2.2).

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
