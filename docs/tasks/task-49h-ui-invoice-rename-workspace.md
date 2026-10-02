# task-49h — ui-invoice-rename-workspace — pattern builder + rename/download

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §3.2 (configurable pattern), §3.3 steps 4-5, §3.4
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 8 of 9
**Dependency:** task-49a, task-49g
**NEEDS:** task-49a, task-49g
**SETUP:** npm install jszip  (skip if task-49f already installed it)
**FILES TO TOUCH:** components/fileTools/RenamePatternBuilder.tsx, app/(public)/file-tools/bulk-file-converter/rename/InvoiceRenameWorkspace.tsx (both new)
**DONE WHEN:**
- Pattern builder offers tokens {invoiceNumber}, {date}, {client}; default Invoice-{invoiceNumber}-{date}.pdf; kept client-side only (no persistence in v1).
- "Rename & Download": 1 file downloads directly under its new name; 2+ download as a ZIP with the new names; duplicate names get -2/-3.
- Toasts: "3 files renamed and downloaded." / "2 renamed, 1 needs manual input."

## Scope
Wires task-49a into task-49g's table. Logged-in-buyer saved patterns (FileToolsPreference) are out of scope for v1.

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.

## Result (2026-10-03)
Built components/fileTools/RenamePatternBuilder.tsx, app/(public)/file-tools/bulk-file-converter/rename/InvoiceRenameWorkspace.tsx and hooks/useInvoiceRename.ts. Also changed: lib/fileTools/downloadBlob.ts (new, shared download helper), hooks/useFileConversion.ts (now imports it instead of its own copy), hooks/useInvoiceExtraction.ts (returns showToast so both hooks share one toast stack), lib/errorMessages.ts (nothingToRename), app/styles/fileTools.css.
- Pattern: default Invoice-{invoiceNumber}-{date}.pdf, token buttons, Reset, memory only. ".pdf" is added if the pattern lacks it. A pattern with no token disables Rename & Download and shows a hint.
- New names: buildFilename per ready row, then dedupeFilenames across the batch (-2, -3). Shown live in the table's New name column.
- Rename & Download: 1 file downloads directly under its new name; 2+ go into renamed-invoices.zip (jszip loaded only then). A row is skipped when every token the pattern uses is empty (it would come out as "unnamed.pdf"); a row missing only some details is still renamed with the missing part left out. Toasts: "3 files renamed and downloaded." / "2 renamed, 1 needs manual input."
- DEVIATIONS: the task listed two files; the logic is in a hook (Rule 31.4) and the shared download helper is its own file. Rule 18.1: typed pattern strips < > [ ] / \ ; ' " ` = but keeps braces, spaces, hyphens and dots, which a pattern needs.
- Tested in Node (throwaway script): default pattern with a duplicate gives Invoice-INV-1-2026-08-15.pdf then ...-2.pdf; missing invoice number gives Invoice-2026-01-02.pdf.
- Type check and lint: no errors in the new or changed files.
- NOT TESTED in a browser: both downloads (single and ZIP, opening the ZIP), skipped row toast, token buttons, Reset, no-token pattern. Also re-check the Convert downloads from task-49f, since that hook now uses the shared helper.
- Not wired to a page yet; task-49i adds the tool page and mode switch.
