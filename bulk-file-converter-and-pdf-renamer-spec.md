# Bulk File Converter & PDF Invoice Renamer — Tool Spec

**Project:** Matthew Studio — File Tools category
**Repo:** ceronGithub/matthew-studio (`shop` branch)
**Extends:** existing "Bulk File Converter" product card (`lib/productsData.ts`,
id: `bulk-file-converter`, slug: `bulk-file-converter`)
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase · Tailwind v4

**Status:** Spec only — no files created/modified in the repo yet. This is Step
1–3 of Rule 46.2 (Improvement Flow): discuss scope → agree → then implement.

---

## 1. Overview

Two related capabilities under one tool, reached from `/file-tools/bulk-file-converter`:

| Capability | What it does |
|---|---|
| **A. File Conversion** | Convert files between formats — one file at a time, or many at once (bulk). |
| **B. PDF Invoice Renaming** | Read invoice data out of a PDF (invoice #, date, client name) and rename the file to a consistent pattern. |

**Assumption (flag if wrong):** B is a mode *inside* the same tool, not a
separate product — triggered automatically when the output/input format is
PDF and the file looks like an invoice. If you'd rather ship it as its own
product card ("PDF Invoice Renamer"), the spec below still applies, just
split into two route segments instead of one.

---

## 2. Feature A — File Conversion (Bulk & Individual)

### 2.1 Supported conversions (proposed default set)

| Category | Formats in | Formats out |
|---|---|---|
| Images | JPG, PNG, WEBP, HEIC | JPG, PNG, WEBP, PDF |
| Documents | DOCX, PDF | PDF, DOCX (best-effort), TXT |
| PDF utilities | PDF | JPG/PNG (per page), merged PDF, split PDF |
| Audio *(optional — flag if in scope)* | MP3, WAV, M4A | MP3, WAV |

Everything runs **client-side in the browser** where possible (image/PDF
conversion via `pdf.js` + `canvas`, same pattern already used on the
`PDF-Extractor-Liza` branch) so files never touch the server for privacy and
to avoid storage/egress cost. Formats that genuinely need a server pass
(DOCX, audio) go through an API route with the file discarded after
processing — never persisted.

### 2.2 Modes

- **Individual mode** — one file, pick target format, convert, download.
- **Bulk mode** — drag-and-drop or select multiple files (mixed formats
  allowed), pick one target format applied to all, convert, download as a
  single ZIP (`JSZip`, same library already used on `PDF-Extractor-Liza`).

### 2.3 Flow

1. User lands on tool page → sees drop zone + "or select files" button.
2. On file select: show file list with detected type, size, and a per-file
   status pill (`Queued` → `Converting` → `Done` / `Failed`).
3. Target format selector appears once at least one valid file is added.
4. User clicks **Convert** → progress bar per file + overall progress.
5. On completion:
   - 1 file → direct download button.
   - 2+ files → "Download all (.zip)" button, plus individual download links.
6. Failed files show an inline reason ("Unsupported format", "File too
   large") — never a raw error object (Rule 34.1).

### 2.4 Limits & validation

- Max file size: 25MB per file (client-side conversion memory limit).
- Max batch size: 50 files per bulk run.
- Forbidden-character stripping (Rule 18.1) does not apply here (file
  uploads, not text inputs) — instead: reject files whose extension doesn't
  match their detected MIME type, and reject empty files.

---

## 3. Feature B — PDF Renaming by Invoice

### 3.1 What it extracts

From the PDF's text layer (via `pdf.js` `getTextContent()` — no OCR needed
for text-based PDFs; scanned/image-only PDFs fall back to "manual rename"):

| Field | Example | Extraction approach |
|---|---|---|
| Invoice number | `INV-2026-0142` | Regex against common labels: `Invoice\s*(No\.?\|#\|Number)?\s*[:\-]?\s*([A-Z0-9\-]+)` |
| Invoice date | `2026-08-15` | Regex against `Date\s*[:\-]?\s*(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4})`, normalized to `YYYY-MM-DD` |
| Client / Bill-to name | `Juan Dela Cruz` | Line following a `Bill To` / `Client` label, first line only |

### 3.2 Rename pattern

Default: `Invoice-{invoiceNumber}-{date}.pdf`
Example: `Invoice-INV-2026-0142-2026-08-15.pdf`

Configurable via a small pattern builder in the UI (drag tokens:
`{invoiceNumber}`, `{date}`, `{client}`) — stored as a client-side default,
not persisted server-side unless the user is a logged-in buyer (see §6).

### 3.3 Flow

1. User uploads one or more PDFs into "Rename by Invoice" mode.
2. Tool extracts fields per file, shows a preview table:
   `Original name → Detected fields → New name` (editable inline — user can
   correct a misread invoice number before confirming).
3. Files where extraction fails (no text layer, no match) are flagged
   `Needs manual input` with editable fields instead of blocking the batch.
4. User clicks **Rename & Download** → single file downloads renamed
   directly; multiple files download as a ZIP with the new names.
5. Toast on completion (Rule 22): `✓ 3 files renamed and downloaded.` /
   `⚠ 2 renamed, 1 needs manual input.`

### 3.4 Edge cases

- Duplicate resulting filenames within one batch → auto-suffix `-2`, `-3`.
- Invoice number contains characters invalid in filenames (`/`, `:`, `*`) →
  strip them before building the filename, keep the raw value in the
  preview table for reference.
- Non-invoice PDFs run through this mode → all fields show "Not detected",
  user can still manually type a name or switch to plain Convert mode.

---

## 4. Proposed file structure (Next.js App Router, per project's Rule 11)

```
app/(public)/file-tools/bulk-file-converter/
├── page.tsx                        ← tool landing/workspace page
├── BulkFileConverter.css
├── convert/
│   └── ConvertWorkspace.tsx        ← Feature A UI (Client Component)
└── rename/
    └── InvoiceRenameWorkspace.tsx  ← Feature B UI (Client Component)

app/api/file-tools/
├── convert-server/route.ts         ← server-side fallback for DOCX/audio only
└── extract-invoice/route.ts        ← optional server-side OCR fallback for scanned PDFs

components/fileTools/
├── FileDropZone.tsx
├── FileQueueList.tsx
├── FormatSelector.tsx
├── InvoicePreviewTable.tsx
└── RenamePatternBuilder.tsx

hooks/
├── useFileConversion.ts            ← queues files, calls conversionEngine, tracks progress
└── useInvoiceExtraction.ts         ← calls invoiceExtractor, manages preview/edit state

lib/fileTools/
├── conversionEngine.ts             ← format conversion logic (canvas/pdf.js/JSZip)
├── invoiceExtractor.ts             ← pdf.js text extraction + regex field parsing
└── filenameBuilder.ts              ← pattern → sanitized filename
```

All client-side heavy lifting stays in `lib/fileTools/`, called from the two
hooks — never inline inside the workspace components, per the project's
custom-hook rule (Rule 31.4).

---

## 5. Data & persistence

- **Anonymous/visitor use:** fully client-side, nothing saved server-side.
  Files never leave the browser for the pdf.js/canvas/JSZip path.
- **Logged-in buyers (optional, later phase):** could save a "last used
  rename pattern" to their profile via a `FileToolsPreference` row in
  Supabase — out of scope for v1, flagged here so it's not forgotten.
- **Server-fallback routes** (`convert-server`, `extract-invoice`) discard
  the uploaded file immediately after processing — never write to disk/DB.

---

## 6. Open questions for you

1. Confirm: one tool with two modes (Convert / Rename by Invoice), or two
   separate product listings?
2. Is a server-side OCR fallback needed for scanned/image-only invoice
   PDFs, or is "flag as needs-manual-input" good enough for v1?
3. Should audio conversion be in scope for v1, or defer it?
4. Any specific invoice formats/labels this needs to handle beyond the
   generic "Invoice No. / Date / Bill To" pattern (e.g. a specific
   accounting software's export layout)?

---

**Files Changed:**
- `bulk-file-converter-and-pdf-renamer-spec.md` (added — spec only, not yet placed in repo)

**Prompt Commit:** `docs: add spec for bulk file converter and pdf invoice renamer`
