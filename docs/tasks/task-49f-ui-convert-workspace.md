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

## Result (2026-10-03)
Built hooks/useFileConversion.ts and app/(public)/file-tools/bulk-file-converter/convert/ConvertWorkspace.tsx. Added jszip (package.json, package-lock.json).
- Hook: queue, target format, one-at-a-time `convertFile` loop, per-file status, overall progress, `convertedOutputs`, `downloadOutput`, lazy-loaded `downloadAllAsZip`, completion toast via components/shared/useToast. A failed file never stops the batch; pressing Convert again retries failed rows. Format list is the set every queued file shares (images: JPG/PNG/WEBP/PDF, PDFs: JPG/PNG/TXT, mixed: JPG/PNG). Changing the format resets results.
- Component: `allowMultiple` prop (bulk vs individual); 1 output shows one Download button, 2+ shows "Download all (.zip)" plus a button per file. Duplicate output names in the ZIP get " (2)".
- DEVIATION (files touched beyond the list): lib/errorMessages.ts (3 messages, Rule 34.1), app/styles/fileTools.css and mediaQueries.css (workspace styles; CSS follows 49e's location). The component imports the CSS by relative path.
- Type check: no errors in the new/changed files. The sandbox's overall `tsc` count is not comparable to the 24 in openFindings (46 here): Prisma client types are not generated in this checkout, and nearly all errors are in Prisma-using files.
- NOT TESTED: no browser run yet. Check: drop 1 and 3 files, convert, ZIP download, a failing file mid-batch, change format after converting, and the carried 49e checks (same file picked twice, tab to button, 768px layout).
- Not wired to a page yet; task-49i adds the tool page and mode switch.
