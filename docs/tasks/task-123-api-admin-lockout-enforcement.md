# task-123 — API: enforce admin account lockout (currently display-only)

**Fulfills spec:** super_admin_account_specification.md Section 5.3
— "locked after 5 failures, 1-hour auto-recovery." Closes the gap
logged in docs/openFindings.md [2026-09-12]: `lib/adminAccountStatus.ts`
already computes a "Locked" display badge from `SecurityLog`
`login_failed` counts, but `app/api/auth/login/route.ts` never
actually blocks the login once that threshold is hit.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library
(grouped here as the other currently-open Phase 7 follow-on; not
CMS-related itself, kept together for scheduling only).
**Dependency:** none.
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** app/api/auth/login/route.ts (modified)

**DONE WHEN:** the 3 verification steps below all pass.

## What this builds
No schema change and no new `lockedUntil` field — the existing
`SecurityLog`-count approach in `lib/adminAccountStatus.ts`
(`LOCKOUT_FAILURE_THRESHOLD = 5`, `LOCKOUT_WINDOW_MINUTES = 60`) is
reused as the actual gate, not just the display badge. The 60-minute
sliding window already gives auto-recovery for free — no cron, no
extra field to expire.

In `app/api/auth/login/route.ts`, for admin/super-admin role attempts
only (buyers are unaffected — Rule 32.4's timing-attack-safe path
stays exactly as-is for them):
1. Before the password compare, count `login_failed` SecurityLog rows
   for this email within the last 60 minutes (same query
   `getAdminAccountStatus` already runs — import and reuse it rather
   than duplicating the query).
2. If count `>= 5`, skip the password compare entirely and return the
   same generic `401` shape used elsewhere (Rule 32.4 — never a
   distinct "account locked" message that would leak which emails
   exist), but log a new `eventType: "admin_login_locked"` to
   SecurityLog (Rule 38.2 — add this event type) so the lockout
   itself is auditable separately from ordinary failed attempts.
3. Gatekeeper (Rule 47.3) integration: `admin_login_locked` is
   **not** an instant-ban trigger, but each occurrence still counts
   toward Gatekeeper's existing strike-ban threshold the same way
   `admin_login_denied` does — no new Gatekeeper code needed, just
   confirm the strike-counting query (which reads `SecurityLog`
   directly) doesn't need an explicit `eventType` allowlist update.

## Verification
1. Fail an admin login 5 times within 60 minutes → the 6th attempt
   (even with the CORRECT password) is rejected with the same
   generic `401` message as a wrong password.
2. Check SecurityLog → an `admin_login_locked` row was written on
   the 6th attempt.
3. Wait for (or backdate) the 60-minute window to pass → the same
   account can log in again with the correct password, with no
   manual unlock needed.
