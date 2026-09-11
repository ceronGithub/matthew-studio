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

## What was built (2026-09-12)

- `app/admin/security/totp-setup/page.tsx` (new) — Server Component
  shell, same split as `app/admin/profile/page.tsx`. Route confirmed
  against `app/admin/` structure at build time (no `security/` folder
  existed yet — created fresh, no naming collision).
- `components/admin/TotpEnrollmentForm.tsx` (new) — client component,
  three stages driven by `useTotpEnrollment`'s status:
  1. Already enabled — confirmation + enrolled-date + back button.
  2. Not yet enrolled, no QR yet — intro + "Generate QR Code".
  3. QR generated — QR image, manual-entry secret with copy-to-
     clipboard, 6-digit code input (autofocus, digits-only), Confirm
     button.
  Reads an optional `?redirectTo=` query param (falls back to
  `/admin/dashboard`) so task-47-totp-setup-gate can later send admins
  back to wherever they were headed — wrapped in `<Suspense>` in the
  page per the same convention as `app/auth/reset-password/page.tsx`
  (Next.js requires this for `useSearchParams`).
  Reused `components/shared/useToast` / `ToastStack` (not the
  `app/buyer/shared/*` path — this project's actual shared-toast
  location) and the manual useState + validate() pattern from
  `components/admin/ProfileForm.tsx` — no React Hook Form anywhere in
  this codebase.
- `lib/hooks/useTotpEnrollment.ts` (new) — `status` (GET), `generate()`
  and `verify(code)` (both POST to the same `/api/auth/totp/enroll`
  endpoint per that route's `action` param), mirroring
  `lib/hooks/useAdminProfile.ts`'s fetch-state/mutation-result shape.
- `app/styles/adminTotpSetup.css` (new) — mirrors
  `app/styles/adminProfile.css`'s token usage and card/button/field/
  skeleton/empty-state conventions; no `mediaQueries.css` entry needed
  (single-column layout is already fluid at all breakpoints).
- No nav link was added to `ProfileForm.tsx` or `app/admin/layout.tsx`
  pointing at this page — out of scope for this micro-task as filed;
  the page is reachable directly at `/admin/security/totp-setup` for
  now, and will gain a real entry point either from a future profile-
  page addition or from task-47-totp-setup-gate's forced redirect.
- Verification: `npx tsc --noEmit` — zero new errors (still the same
  45 pre-existing errors from the sandbox's ungenerated Prisma client,
  same `binaries.prisma.sh`-blocked baseline noted in
  task-47-api-totp-enroll.md; none in the new files). `npx eslint` on
  the 3 new files surfaces one `react-hooks/set-state-in-effect`
  finding in `useTotpEnrollment.ts` — confirmed pre-existing on
  `lib/hooks/useAdminProfile.ts` too (same `fetchX()` call inside
  `useEffect` pattern already established in this codebase), so this
  is not a regression introduced here.

## Explicitly out of scope

- The login-time TOTP prompt (task-47-ui-totp-login-step) — this page
  is enrollment only, reached either voluntarily from account settings
  or via the forced gate (task-47-totp-setup-gate).
- A nav/profile-page entry point linking to this page (see note above).
