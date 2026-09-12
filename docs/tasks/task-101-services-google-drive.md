# task-101 — Services: Google Drive upload helper

**Fulfills spec:** Rule 35.7 (Google Drive Standard) + Rule 40.2
(offsite backup destination for `pg_dump` archives).
**taskPlan.md phase:** Phase 4 (remainder) — Backups
**Dependency:** None — independent of task-100, can be built in
parallel; task-102 depends on this.

## What this builds
`services/googleDrive.ts` — server-side only, following the exact
pattern in Rule 35.7:
- `getDriveClient()` — authenticates via service account
  (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
  with `\n` un-escaped in the private key).
- `uploadToDrive(fileName, buffer, mimeType)` — uploads into
  `GOOGLE_DRIVE_FOLDER_ID`, sets `reader/anyone` permission, returns
  `{ fileId, viewLink }`.
- `deleteFromDrive(fileId)` — for cleanup if ever needed.

## Notes
- Does NOT exist yet in this repo — `services/r2.ts` already exists
  (built for buyer downloads/product media) and is reusable as-is for
  backup uploads via its existing `uploadToR2()` export; no changes
  needed there.
- This file is Backups' only offsite-redundancy destination alongside
  R2 — per Rule 40.2 both may be used for redundancy.
- Server-side only — never imported from a `"use client"` file.

## New `.env` / `.env.local` keys required
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
```

## Verification
1. Set the three env keys above.
2. Call `uploadToDrive()` with a small test buffer from a scratch script.
3. Expected: returns a `viewLink` that opens in browser without sign-in.
4. Failure looks like: a Google API auth error — usually the private
   key's `\n` escaping or a folder-ID permission issue.
