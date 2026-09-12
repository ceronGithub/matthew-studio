# task-103 — CI: nightly backup workflow

**Fulfills spec:** Rule 40.1 (backups run on separate infrastructure,
never inside the app's own hosting) + `infra_ops_specification.md`
§4.1's cross-reference to this workflow.
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** task-102 (`scripts/runBackup.js` must exist and work
locally first).

## What this builds
`.github/workflows/database-backup.yml`:
- Cron trigger for the lowest-traffic window (e.g. `0 18 * * *` UTC
  ≈ 2 AM local, confirm actual timezone with developer).
- Runs on GitHub's own cloud runner — never on the app's hosting.
- Steps: checkout → setup Node → `npm ci` → `npm run backup`, with
  all required secrets (`DIRECT_URL`, R2 keys, Google Drive keys)
  injected via GitHub Actions repository secrets.
- Also exposes `workflow_dispatch` so a manual on-demand run is
  possible from GitHub's own UI — this is the ONLY sanctioned way to
  trigger an ad-hoc backup (never a button in the app itself, per
  Rule 40.6).

## Notes
- Never add a "Run Backup Now" button to the Backups page (task-105)
  — that would reintroduce backups into the live app's request cycle.

## Verification
1. Add all required secrets to the GitHub repo settings.
2. Manually trigger via `workflow_dispatch` in the Actions tab.
3. Expected: workflow run succeeds (green check), and a new
   `BackupLog` row appears in the database afterward.
4. Failure looks like: a red X on the run — check the step logs for
   which command failed (usually a missing/incorrect secret).
