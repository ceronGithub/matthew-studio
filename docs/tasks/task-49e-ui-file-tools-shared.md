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

## Result (2026-10-03)
Built the three shared components and their validation. New files: components/fileTools/FileDropZone.tsx, FileQueueList.tsx, FormatSelector.tsx; lib/fileTools/fileValidation.ts; lib/errorMessages.ts; app/styles/fileTools.css. Modified: app/styles/mediaQueries.css (one 768px block for the queue row).
- `validateFiles(newFiles, alreadyQueuedCount, allowMultiple)` checks empty, over 25MB, supported type, extension vs contents (first bytes, not the browser MIME type), then queue room (50). Limits are imported from conversionEngine.ts, not repeated. Each refusal has its own sentence.
- FileDropZone: drag-and-drop plus "Select files" button, "Checking your files…" loading state, refused-files list with Dismiss. FileQueueList: type tag, size, Queued/Converting/Done/Failed pill, inline failure reason, skeleton and empty states, optional Remove button. FormatSelector: native radio group, 44px targets, shows only the formats the parent passes (parent hides it until a valid file exists). Exports `FileQueueItem` / `FileQueueStatus` types for task-49f's hook.
- DEVIATION 1 (CSS): the task named components/fileTools/FileTools.css. No component in this project keeps its CSS beside it; ToastStack and CartDrawer import from app/styles/, and home/* use app/styles/home.css. Used app/styles/fileTools.css, imported by relative path, to match.
- DEVIATION 2 (messages): the task said to add to the project's centralized errorMessages file. None exists anywhere in the repo, so lib/errorMessages.ts was created with a `fileToolMessages` group; later features can add their own groups there.
- Added individual-mode handling the task did not spell out: with allowMultiple=false only the first file is kept and extras get a "one file at a time" message.
- Tested in Node (throwaway script, not kept): PNG and PDF accepted; empty, 26MB, PNG-named JPEG, and .txt each rejected with the right code; full queue rejects a valid file as batchTooLarge; 48 queued + 3 valid accepts 2; single mode keeps 1. Type check: no errors in the new files.
- NOT TESTED: rendering and drag-and-drop in a real browser (components were only type-checked). Carry to task-49f's first browser run: drop a file, pick the same file twice in a row, tab to the button, check the 768px row layout.
