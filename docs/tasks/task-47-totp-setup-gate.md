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
