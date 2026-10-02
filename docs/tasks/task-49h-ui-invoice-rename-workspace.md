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
