# task-49i — ui-tool-page-shell — tool page, mode switch, product-card link

**Fulfills:** bulk_file_converter_and_pdf_renamer_specification.md §1 (one tool, two modes), §4 (file structure)
**taskPlan.md phase:** PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES, item 10 (bulk_file_converter_and_pdf_renamer_specification.md), parent task-49, part 9 of 9
**Dependency:** task-49f, task-49h
**NEEDS:** task-49f, task-49h
**SETUP:** none
**FILES TO TOUCH:** app/(public)/file-tools/bulk-file-converter/page.tsx, BulkFileConverter.css (both new); possibly app/(public)/file-tools/[slug]/page.tsx and lib/productsData.ts (only if the card does not already resolve to the new route — verify first)
**DONE WHEN:**
- /file-tools/bulk-file-converter renders a Convert / Rename by Invoice mode switch over the two workspaces.
- Page exports metadata (Rule 31.9) and has sibling error.tsx + loading.tsx (Rule 31.10).
- The existing "Bulk File Converter" product card leads to this page. Note: a static bulk-file-converter folder takes precedence over the existing [slug] route for that slug.
- Active overview file gets a STRUCTURE UPDATES entry for the new route and lib/hooks/components files (Rule 16 / 45.5).

## Notes
v1 defaults (approved 2026-10-03): one tool with two modes; no OCR; no audio; no DOCX; generic Invoice No./Date/Bill To patterns only; fully client-side, no schema change.
