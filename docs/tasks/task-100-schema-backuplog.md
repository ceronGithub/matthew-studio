# task-100 — Schema: BackupLog model

**Fulfills spec:** Rule 40.4 (Backup & Disaster Recovery Standard) —
no dedicated spec-doc section exists for Backups (taskPlan.md's prior
"Section 3.5" citation was a mislabel copied from the Analytics task;
`infra_ops_specification.md` only cross-references Rule 40.5 in
passing at §4.1, it doesn't define the model). Rule 40.4 itself is
the source of truth for this schema.
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** None — first item in the Backups breakdown, everything
else in this split depends on this model existing.

## What this builds
Add the `BackupLog` model to `prisma/schema.prisma` exactly as specified
in Rule 40.4:

```prisma
model BackupLog {
  id            String    @id @default(cuid())
  status        String    @default("running") // running | success | failed
  fileSizeBytes Int?
  r2Key         String?
  r2Url         String?
  driveFileId   String?
  driveViewLink String?
  errorMessage  String?
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
}
```

## Notes
- One row per backup run, written only by `scripts/runBackup.js`
  (task-102) — never by the live app.
- `status` is `"failed"` only if EVERY destination failed; partial
  success (e.g. R2 ok, Drive failed) is still `"success"` with the
  failure noted in `errorMessage`, prefixed per destination.

## Run in terminal after this change (Supabase default, Rule 21/37.2)
```bash
npx prisma db push
npx prisma generate
```
