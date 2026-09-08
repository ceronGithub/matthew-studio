# task-47 — ui-totp-login-step — login page TOTP prompt

**Fulfills:** super_admin_account_specification.md Section 12 Phase 1
("TOTP enrollment screen and verification step") + acceptance criterion
("super-admin logs in with password + TOTP")
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 5 of 6
**Dependency:** task-47-api-totp-login-verify [ ] must be [DONE] first.

## Scope (not yet built — planning only)

- Modify `app/auth/login/page.tsx` (viewed 2026-09-08 — currently a
  single-step email/password form) to handle a second step: when
  `POST /api/auth/login` responds with a "TOTP required" signal
  (pending token, no session cookies set yet — per
  task-47-api-totp-login-verify), swap the form to a 6-digit code
  input instead of navigating away.
- Submits the code + pending token to `POST /api/auth/totp/verify-login`.
  On success, proceeds with the existing post-login redirect logic
  (role-based routing, per `lib/roleRouting.ts`).
- On a wrong code: inline error, never reveal remaining attempts before
  lockout (Rule 34.1 — generic, human-readable message).
- Buyers and un-enrolled admins never see this step — it only appears
  when the login response explicitly signals TOTP is pending.

## Explicitly out of scope

- The enrollment page itself (task-47-ui-totp-enrollment)
- The forced-enrollment middleware gate (task-47-totp-setup-gate)
