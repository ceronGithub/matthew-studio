# task-47 — ui-totp-enrollment — enrollment screen

**Fulfills:** super_admin_account_specification.md Section 12 Phase 1
("TOTP enrollment screen and verification step")
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 4 of 6
**Dependency:** task-47-api-totp-enroll [ ] must be [DONE] first.

## Scope (not yet built — planning only)

- New page, e.g. `app/admin/security/totp-setup/page.tsx` (exact path
  to be confirmed against how `/admin/profile` and other admin-security
  pages are already routed — check `app/admin/` structure at build
  time rather than assuming).
- Displays the QR code returned by `POST /api/admin/totp/enroll` (plus
  the manual-entry secret as a fallback for authenticator apps that
  can't scan), a 6-digit code input, and a Confirm button that calls
  `POST /api/admin/totp/enroll/verify`.
- Standard form UX per Rule 34.3: autofocus the code input, disable
  submit while verifying, inline error on a wrong code (never a modal
  or alert()).
- Toast on success (Rule 22) and redirect to the admin dashboard (or
  back to wherever the setup gate redirected from).
- Loading/empty/error states per Rule 25 while the QR code is being
  generated.

## Explicitly out of scope

- The login-time TOTP prompt (task-47-ui-totp-login-step) — this page
  is enrollment only, reached either voluntarily from account settings
  or via the forced gate (task-47-totp-setup-gate).
