# task-33 (API half) — Gatekeeper device-ban management API

**Spec:** gatekeeper_specification.md Sections 5.2, 8, 9
**Status:** DONE — 2026-09-07
**Shared task id:** listed under both item 6 (vault_specification.md's
last sub-task) and item 7 (gatekeeper_specification.md's remaining
gap) in docs/taskPlan.md, per that file's own dual-listing note.
Split into an API half (this file) and a UI half (not yet built)
because the combined work crosses 2+ layers and bundles distinct
sub-features — Rule 49 Step 4's micro-task threshold.

## What this covers

- `lib/gatekeeper.ts` — added:
  - `listDeviceBans({ page, limit, triggerEventType, isActive, dateFrom, dateTo })`
  - `manualBanDevice({ deviceFingerprint, reason, bannedByEmail })`
  - `unbanDevice({ banId, unbanNote, unbannedByEmail })`
  - `writeGatekeeperAuditLog()` (internal) — writes `device_banned` /
    `device_unbanned` SecurityLog rows directly via Prisma for the
    **banned device's** fingerprint, not the calling admin's. Bypasses
    `lib/securityLog.ts`'s `logSecurityEvent()` on purpose: that helper
    fingerprints the request it's called from, and importing it here
    would be circular (`securityLog.ts` already imports
    `evaluateGatekeeperTriggers` from this file).
- `app/api/superadmin/gatekeeper/bans/route.ts`
  - `GET` — paginated (default 25/page), filterable by
    `triggerEventType`, `isActive`, `dateFrom`/`dateTo`. Response
    shape matches Rule 28 / the spec's Section 9 example.
  - `POST` — manual ban (Section 5.2). Rejects a device that already
    has an active ban (409) rather than creating a duplicate row.
- `app/api/superadmin/gatekeeper/bans/[banId]/unban/route.ts`
  - `PUT` — requires a non-empty `unbanNote`; 400 without one.

Both routes gate on `role === "superAdmin"` strictly (not the
admin-OR-superAdmin pattern most `/api/admin/*` routes use), per
Section 8's "the only place any ban can be lifted" / super-admin-only
scope.

## What this does NOT cover (UI half, still pending)

- `/superAdmin/gatekeeper` page itself — DataTable, filter controls,
  row-expand for `relatedLogIds`, and the unban confirmation modal
  (needs a note-input variant of `components/shared/ConfirmationModal.tsx`,
  which currently has no text-input slot).
- `device_banned` / `device_unbanned` are new `SecurityLog.eventType`
  values — no schema change needed (`eventType` is a plain `String`),
  but the Rule 38.9 Security Logs viewer page (task-45, not yet built)
  will need its event-type filter dropdown to include them once that
  page exists.

## Verification

1. `npx prisma db push && npx prisma generate` (local — sandbox
   blocks `binaries.prisma.sh`).
2. `npx tsc --noEmit` — zero new errors from this change.
3. As a super-admin, `POST /api/superadmin/gatekeeper/bans` with a
   fingerprint + reason → expect `201`-shaped success JSON and a new
   `DeviceBan` row with `triggerEventType: "manual"`.
4. `GET /api/superadmin/gatekeeper/bans` → the row from step 3 appears,
   newest first.
5. `PUT /api/superadmin/gatekeeper/bans/<banId>/unban` with an empty
   `unbanNote` → expect `400`. Retry with a note → `200`, and the
   `DeviceBan` row now has `isActive: false`.
6. Confirm two new `SecurityLog` rows exist (`device_banned` from step
   3, `device_unbanned` from step 5), each carrying the *banned
   device's* fingerprint, not the calling admin's.
