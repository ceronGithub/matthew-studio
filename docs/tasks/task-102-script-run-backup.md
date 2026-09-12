# task-102 — Script: scripts/runBackup.js

**Fulfills spec:** Rule 40.1 / 40.5 (Backup & Disaster Recovery
Standard — standalone script, never a Next.js API route).
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** task-100 (BackupLog model must exist) and task-101
(Google Drive helper must exist) — both [DONE] required first.

## What this builds
`scripts/runBackup.js`:
1. Create a `BackupLog` row with `status: "running"` at start.
2. Connect via `DIRECT_URL` (session pooler, already defined in
   `prisma.config.mjs`) — never the app's transaction-pooler
   `DATABASE_URL`.
3. Shell out to `pg_dump`, gzip the output.
4. Upload independently to:
   - Cloudflare R2 via `services/r2.ts`'s existing `uploadToR2()`
   - Google Drive via `services/googleDrive.ts`'s `uploadToDrive()`
     (task-101)
   One destination failing must never block the other.
5. Update the `BackupLog` row: `status: "success"` if at least one
   destination succeeded (with per-destination failure noted in
   `errorMessage`, prefixed e.g. `"Drive: <error>"`), `"failed"` only
   if both failed. Set `fileSizeBytes`, `r2Key`/`r2Url`,
   `driveFileId`/`driveViewLink`, `completedAt`.

## Notes
- Never triggered by an incoming request of any kind — invoked only
  via `npm run backup` (wired in task-103's CI workflow, or manually
  via `workflow_dispatch` if ever needed).
- No dedicated logging helper required (per Rule 40.5) — the script
  itself is the isolated unit.

## Root `package.json` addition
```json
"scripts": {
  "backup": "node scripts/runBackup.js"
}
```

## Verification
1. Run `npm run backup` locally with valid `DIRECT_URL`, R2, and
   Drive env vars set.
2. Expected: a new `BackupLog` row appears with `status: "success"`,
   both `r2Url` and `driveViewLink` populated.
3. Failure looks like: `status: "failed"` with `errorMessage`
   naming which destination(s) failed and why.
