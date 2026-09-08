# task-47 — api-totp-enroll — enrollment API routes

**Fulfills:** super_admin_account_specification.md Section 9.1 +
Section 12 Phase 1
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 2 of 6
**Dependency:** task-47-schema-totp [ ] must be [DONE] first
  (needs `AdminTotpCredential` model + the TOTP/QR libraries).

## Scope (not yet built — planning only)

- `POST /api/admin/totp/enroll` — admin/superAdmin only (role check via
  existing session pattern, e.g. `lib/getSessionAdmin.ts`). Generates a
  new TOTP secret, stores it `secretEncrypted` with `enabled: false`
  (upsert — a re-enrollment attempt while already enabled should be
  rejected or require the current code first, to prevent a hijacked
  session from silently swapping the secret). Returns the QR code
  (data URI) + manual entry secret — never the raw secret in a log.
- `POST /api/admin/totp/enroll/verify` — accepts a 6-digit code,
  verifies it against the pending `secretEncrypted` row, and on match
  flips `enabled: true` + sets `enrolledAt`. On failure, generic error
  message (Rule 34.1) — never reveal whether the row exists.
- Both routes: `export const dynamic = "force-dynamic"` (Rule 31.3),
  standard `{ success, data, message }` shape (Rule 28), rate-limited
  per Rule 32.1's pattern (enrollment isn't in the priority table, but
  reuse the general-API limit at minimum since it's auth-adjacent).
- Log both outcomes to `SecurityLog` via `logSecurityEvent()` — new
  `eventType` values, e.g. `totp_enrollment_started` /
  `totp_enrollment_completed` / `totp_enrollment_failed`.

## Explicitly out of scope

- Login-time verification (task-47-api-totp-login-verify) — this task
  is enrollment only, not the login gate.
- UI (task-47-ui-totp-enrollment)
