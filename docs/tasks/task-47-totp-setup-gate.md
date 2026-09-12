# task-47 — totp-setup-gate — forced enrollment redirect

**Fulfills:** super_admin_account_specification.md Section 9.1
("Password alone is not enough for the highest-privilege account" —
i.e. an admin/superAdmin without TOTP enrolled must not be able to
just skip it indefinitely)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 6 of 6 (last)
**Dependency:** task-47-schema-totp, task-47-api-totp-enroll, and
  task-47-ui-totp-enrollment must all be [DONE] first — this gate
  redirects to the enrollment page and reads the schema, so both must
  exist before the gate can be wired in.

## Scope (not yet built — planning only)

Mirrors the existing buyer recovery-setup gate pattern
(`docs/tasks/task-41-recovery-setup-gate.md`, `lib/recoverySetup.ts` →
`isRecoverySetupComplete()`), applied to admin/superAdmin + TOTP
instead of buyer + recovery setup:

- New `lib/totpSetup.ts` (or similar) — `isTotpEnrolled(userId)`,
  read-only lookup on `AdminTotpCredential.enabled`. Same fail-open
  convention as `lib/gatekeeper.ts`'s `checkDeviceBan` and
  `lib/recoverySetup.ts` (a DB error should fail open rather than
  lock every admin out — confirm this convention still applies here,
  since a security gate failing open is a real tradeoff worth a
  one-line comment explaining the decision either way).
- `middleware.ts` — new branch: if role is `admin` or `superAdmin` and
  `isTotpEnrolled()` is false, redirect to
  `/admin/security/totp-setup` instead of letting the request through
  to `/admin/*` or `/superAdmin/*`. The enrollment page itself must be
  excluded from this redirect (never an infinite loop).

## Explicitly out of scope

- Building the enrollment page or its APIs — this task only wires the
  existing (by this point, already-built) pieces into `middleware.ts`.

## What was built (2026-09-12)

- `lib/totpSetup.ts` (new) — `isTotpEnrolled(userId)`, read-only
  lookup on `AdminTotpCredential.enabled`. Fails open on a DB error
  (mirrors `lib/recoverySetup.ts`'s `isRecoverySetupComplete()`) —
  a lookup outage should never lock every admin out of their own
  dashboard.
- `middleware.ts` — added `TOTP_SETUP_PATH` constant
  (`/admin/security/totp-setup`) and a new branch right after the
  existing `/superAdmin` and `/admin` role-mismatch checks: if the
  pathname starts with `/admin` or `/superAdmin`, isn't the setup
  page itself, the role is `admin`/`superAdmin`, and
  `isTotpEnrolled()` is false, redirect to `TOTP_SETUP_PATH`. The
  setup page is explicitly excluded from its own check, so an
  unenrolled admin can still reach it to enroll.
- Verified no infinite-loop risk: `TOTP_SETUP_PATH` is checked with
  strict equality before the redirect fires.
- task-47 (2FA/TOTP enrollment) is now fully closed — all 6 parts
  done.
