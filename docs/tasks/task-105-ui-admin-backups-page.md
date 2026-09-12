# task-105 — UI: /superAdmin/backups page

**Fulfills spec:** Rule 40.6 (Super-Admin Backups Page, mandatory).
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** task-104 (list API must exist).

## What this builds
`app/superAdmin/backups/page.jsx` (+ matching CSS):
- Same DataTable + StatusBadge pattern already used on the Security
  Logs (Rule 38.9), Analytics (Rule 41.3), and Account Activity
  (Rule 42.3) pages in this repo — reuse the existing shared
  components, don't rebuild the pattern from scratch.
- Paginated, newest first, one row per `BackupLog` entry.
- Status badge per run: `success` (green) / `failed` (red) /
  `running` (amber).
- Shows file size, R2 URL link, Google Drive `viewLink` when present,
  and the recorded `errorMessage` when a run failed or partially
  failed.
- **Strictly read-only** — no "Run Backup Now" button (Rule 40.6);
  on-demand runs go through GitHub Actions' `workflow_dispatch`
  (task-103) instead.

## Notes
- Loading skeleton, empty state ("No backups have run yet."), and
  error state per Rule 25 — same as every other data-fetched page.

## Verification
1. Sign in as super-admin, navigate to `/superAdmin/backups`.
2. Expected: table lists backup runs newest-first with correct status
   colors; links open the R2/Drive URLs directly.
3. With zero `BackupLog` rows: expected empty state message, not a
   blank screen.
4. Failure looks like: a raw error string on screen instead of the
   friendly error state (Rule 34.1) — indicates the API call isn't
   wrapped correctly.
