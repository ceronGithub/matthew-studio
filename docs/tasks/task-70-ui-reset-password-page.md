# task-70 — Reset-password page UI

**Fulfills:** buyer_password_recovery_specification.md Section 4.6
(FORGOT PASSWORD FLOW, "new password on a separate page" step)
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md)
— task-36 split into task-66 through task-70; this is the final
UI-reset-password slice.
**Dependency:** task-68 (`/api/auth/forgot-password/reset`) — [DONE]

## What was built

- `components/auth/ResetPasswordForm.tsx` (replaced). Reads the
  `resetToken` from the `?token=` query param via `useSearchParams()`
  instead of relying on Supabase's URL-fragment recovery session.
  Client-side password validation mirrors task-68's server rules
  (min 8 chars, uppercase, number, special character — same
  `isPasswordStrongEnough()` helper as before). Submits
  `{ resetToken, newPassword }` to `/api/auth/forgot-password/reset`
  with the CSRF header. On a server rejection (invalid/expired/
  already-used token — one generic message, no distinguishing which),
  switches to a "request a new link" state pointing back to
  `/auth/forgot-password`, same UX shape as a missing token. On
  success, redirects to `/auth/login` (not the buyer dashboard — this
  flow never had a live session to hand off; task-68's Rule 44 step
  already terminated any that existed).
- `app/auth/reset-password/page.tsx` (modified). Wraps
  `ResetPasswordForm` in `<Suspense>`, required by Next.js for any
  component calling `useSearchParams()`, even on a fully `"use
  client"` page.

## Retired (per the same "replace, don't run a parallel URL"
## precedent task-69 set for the legacy forgot-password flow)

- `app/api/auth/reset-password/route.ts` deleted. It was a
  logging-only endpoint whose sole caller was the just-replaced
  `ResetPasswordForm`'s fire-and-forget call after
  `supabaseBrowserClient.auth.updateUser()` — confirmed via
  repo-wide grep before deletion that no other file referenced this
  route. Its `password_reset_completed` SecurityLog eventType is
  already logged by task-68's `/reset` route directly, so no
  observability is lost.

## Status: DONE

## Verification

Could not run `npx tsc --noEmit` or install `node_modules` in this
sandbox — no network access to the npm registry (same limitation
noted in every prior task in this repo). Manually verified:
- Confirmed via grep that `app/api/auth/reset-password/route.ts` had
  exactly one caller in the whole repo (the old `ResetPasswordForm.tsx`,
  now replaced) before deleting it.
- `getCsrfHeader`, `PASSWORD_REQUIREMENTS_HINT`, `PasswordStrengthMeter`,
  `useToast`/`ToastStack` imports all resolve to existing exports —
  checked each source file directly.
- `.authForm`/`.authField`/`.authPasswordWrapper`/`.authFieldError`/
  `.authSubmitButton` classes confirmed already defined in
  `app/styles/auth.css` — no new CSS needed.

### Manual verification steps (run locally)

1. Run `npm run dev`.
2. Complete `/auth/forgot-password`'s flow (task-69) for a real buyer
   account up through "Continue to reset password" — this lands on
   `/auth/reset-password?token=<resetToken>`.
3. Enter a new password meeting all 4 strength rules + matching
   confirm field → Reset password. Expect a "Password updated…"
   toast and a redirect to `/auth/login`.
4. Log in with the OLD password → expect failure.
5. Log in with the NEW password → expect success.
6. Revisit the SAME `/auth/reset-password?token=...` URL again →
   submit any password → expect the "request a new link" state
   (token was consumed on first use, per task-68).
7. Visit `/auth/reset-password` with no `?token=` at all → expect the
   "request a new link" state immediately, no form shown.
