# task-47 — api-totp-login-verify — login flow TOTP gate

**Fulfills:** super_admin_account_specification.md Section 9.1
("TOTP required in addition to password before reaching
`/superAdmin/*`") + Section 12 Phase 1's acceptance criterion
("super-admin logs in with password + TOTP and lands on
`/superAdmin/dashboard`")
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 3 of 6
**Dependency:** task-47-schema-totp [ ] must be [DONE] first.

## Scope (not yet built — planning only)

Modify `app/api/auth/login/route.ts` (viewed 2026-09-08 — currently
issues session cookies immediately after the anomaly check passes, with
no TOTP step):

- After `detectAnomalies()` passes, check whether the authenticated
  user has an `AdminTotpCredential` row with `enabled: true`. Buyers
  never have one — this branch only applies to `admin`/`superAdmin`
  roles, matching the existing `buildLoginResponseData` role check.
- If TOTP is enabled for that user: do NOT set the `sb-access-token` /
  `sb-refresh-token` cookies yet. Instead issue a short-lived,
  single-purpose "pending TOTP" token (separate from the real session —
  e.g. a signed, short-expiry JWT or a server-side pending-login row)
  and return it in the response so the client can submit the TOTP code
  next. Never grant `/superAdmin/*` or `/admin/*` access before the
  code is verified.
- New route: `POST /api/auth/totp/verify-login` — accepts the pending
  token + 6-digit code, verifies against `AdminTotpCredential`, and on
  success performs the SAME cookie-issuance + `buildLoginResponseData`
  flow currently inline in `login/route.ts` (extract that into a shared
  helper so both routes call one implementation — never duplicate the
  cookie-setting logic).
- Failed TOTP attempts log to `SecurityLog` (`totp_login_failed`) and
  count toward the existing lockout logic (Section 5.3 / Rule 32.1) —
  never a separate, unlimited-attempts side channel for guessing codes.
- If TOTP is NOT enabled for that admin/superAdmin (not yet enrolled):
  this is where task-47-totp-setup-gate's middleware redirect takes
  over — the login route itself still completes normally, and the
  gate is what forces them to `/admin/security/totp-setup` before they
  can reach any other protected page.

## What was built (2026-09-08)

- `app/api/auth/login/route.ts` — after `detectAnomalies()` passes,
  queries `AdminTotpCredential` for the account (admin/superAdmin
  only). If an `enabled: true` row exists, no cookies or Vault slug
  are issued; instead a pendingToken is returned with `{ totpRequired:
  true, pendingToken }` and the message "Enter the 6-digit code from
  your authenticator app." Logs `totp_login_pending`.
- `lib/pendingTotpLogin.ts` (new) — `createPendingTotpLoginToken()` /
  `parsePendingTotpLoginToken()`. AES-256-GCM (same primitive as
  `lib/totpCrypto.ts`) over a JSON payload (userId, email, role, the
  Supabase access/refresh tokens, and a 5-minute `expiresAt`), keyed
  by a **new, dedicated** `PENDING_TOTP_LOGIN_KEY` env var — never
  reuses `TOTP_ENCRYPTION_KEY` (key separation). Self-contained: no
  new Prisma model or migration, since the pending state lives entirely
  inside the encrypted token itself. `parse` never throws — any
  malformed/tampered/wrong-key/expired token returns `null`.
- `lib/loginSession.ts` (new) — `buildLoginResponseData()`,
  `setSessionCookies()`, and `createLoginSuccessResponse()`, extracted
  verbatim (behavior-preserving) from what used to be inline in
  `login/route.ts`. This is the single "grant a session" implementation
  both `login/route.ts` (non-2FA accounts) and the new verify-login
  route below call — no duplicated cookie-setting code, per this
  task's scope.
- `app/api/auth/totp/verify-login/route.ts` (new) — `POST` only, under
  the same `/api/auth/totp/*` namespace as `enroll` (per that task's
  routing note). CSRF check, then a 5/15min rate limit (label
  `"totp-login-verify"` — this is the "existing lockout logic" the
  scope called for, not a new Gatekeeper strike category). Decrypts
  the pendingToken, re-confirms the credential is still `enabled:
  true` (it could have been disabled in the few minutes since /login),
  checks the code via otplib's `verify()` (30s `epochTolerance`,
  matching `task-47-api-totp-enroll`'s handling), stamps
  `lastVerifiedAt`, logs `totp_login_verified`, and calls
  `createLoginSuccessResponse()` using the session tokens carried
  inside the pendingToken. A bad/expired/tampered token and a wrong
  code both return the same generic message (Rule 34.1) and both log
  `totp_login_failed`.
- Verification: `npx tsc --noEmit` — zero new errors (the 45
  project-wide errors are the same pre-existing ungenerated-Prisma-
  client baseline; `binaries.prisma.sh` still blocked in this sandbox
  — run `npx prisma generate` locally, no `db push` needed since the
  schema didn't change this pass). `npx eslint` clean on every
  new/changed file.
- New required env var: `PENDING_TOTP_LOGIN_KEY` (documented in
  `overviewProject.txt` Section 7) — must be set before this flow can
  be exercised locally or in any deploy environment.

## Explicitly out of scope

- The enrollment endpoints themselves (task-47-api-totp-enroll)
- The gate that forces un-enrolled admins to set up TOTP
  (task-47-totp-setup-gate) — this task only handles the case where
  TOTP is already enabled and must be verified at login.
- No UI — the login page's TOTP prompt (task-47-ui-totp-login-step)
  is a separate micro-task; this task only built the API contract it
  will call (`{ pendingToken, code }` → session or generic error).
