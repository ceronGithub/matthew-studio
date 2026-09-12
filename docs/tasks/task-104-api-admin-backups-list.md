# task-104 — API: GET /api/superAdmin/backups

**Fulfills spec:** Rule 40.6 (super-admin Backups page needs a
read source) + Rule 28 (API response shape standard).
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** task-100 (`BackupLog` model must exist).

## What this builds
`app/api/superAdmin/backups/route.ts`:
- `export const dynamic = "force-dynamic"` (Rule 31.3).
- Guarded by the existing super-admin auth check (same pattern as
  the other `/api/superAdmin/*` routes already in this repo — reuse,
  don't reinvent).
- Paginated `GET`, newest-first, reading `BackupLog` only —
  **strictly read-only**, no POST/trigger endpoint here (Rule 40.6).
- Standard success/error response shape (Rule 28).

## Notes
- This route must never call `scripts/runBackup.js` or trigger a
  backup — it only reads rows the CI-run script already wrote.

## Verification
1. Ensure at least one `BackupLog` row exists (run task-102/103 first,
   or seed one manually for testing).
2. Hit `GET /api/superAdmin/backups` while signed in as super-admin.
3. Expected: `{ success: true, data: { logs: [...], totalCount, ... } }`.
4. Failure looks like: `401`/`403` if the auth guard misfires, or an
   empty `logs` array if no backups have run yet (not an error state).
