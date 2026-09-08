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

## Explicitly out of scope

- The enrollment endpoints themselves (task-47-api-totp-enroll)
- The gate that forces un-enrolled admins to set up TOTP
  (task-47-totp-setup-gate) — this task only handles the case where
  TOTP is already enabled and must be verified at login.
