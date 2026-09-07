# task-69 — Forgot-password page (UI)

**Fulfills:** buyer_password_recovery_specification.md Section 4
(FORGOT PASSWORD FLOW, Steps 1–3 UI) and Section 5's client-facing
usage of the `/initiate` and `/verify` endpoints.
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md)
  — task-36 split into task-66 through task-70; this is the
  UI-forgot-password slice.
**Dependency:** task-67 (`/initiate` + `/verify` API) — [DONE]

## What was built

- `components/auth/ForgotPasswordWizard.tsx` (new) — 4-step wizard:
  `identify` → `method` → `verify` → `done`. Mirrors
  `RecoverySetupWizard.tsx`'s state-per-field pattern and CSS classes
  for consistency (this codebase doesn't use React Hook Form for auth
  wizards, so this follows that established convention rather than
  Rule 31.7's default).
  - `identify`: email input → `POST .../initiate` → always succeeds
    with the 3 method cards + a question preview (real or generic).
  - `method`: three `MethodCard` buttons (email / Telegram / security
    question). Email/Telegram immediately fire
    `POST .../verify { action: "send" }` and advance; security
    question skips the send step.
  - `verify`: OTP input (email/Telegram, 60s local resend cooldown —
    the API's `action: "send"` response is deliberately generic and
    carries no server-issued cooldown) or answer input (security
    question). `POST .../verify { action: "verify" }` returns a
    one-time `resetToken`.
  - `done`: links to `/auth/reset-password?token=...` (see "Known
    transitional gap" below).
- `app/styles/forgotPassword.css` (new) — method-selection card
  styles only; imports alongside `recoverySetup.css` on the page to
  reuse its step-dot/OTP-row/resend-link classes rather than
  duplicating them.
- `app/auth/forgot-password/page.tsx` (modified) — now renders
  `ForgotPasswordWizard` instead of the retired `ForgotPasswordForm`.

## Legacy flow retirement (developer-confirmed)

`/auth/forgot-password` was previously wired to a Supabase-native
single-form flow (`ForgotPasswordForm` → `/api/auth/forgot-password`
→ `supabaseServerClient.auth.resetPasswordForEmail()`), flagged as a
coexisting-but-unrelated system in task-67's notes. Developer chose
**replace, not parallel URL** — same route, new flow. Deleted as
superseded (Rule 8A cleanup):
- `components/auth/ForgotPasswordForm.tsx`
- `app/api/auth/forgot-password/route.ts`

Both were confirmed (via `grep -rl`) to have no other referrers before
deletion. `app/api/auth/reset-password/route.ts` and
`components/auth/ResetPasswordForm.tsx` were **not** touched — they
back `/auth/reset-password`, which is task-70's job.

## Known transitional gap (flagged, not solved silently)

The `done` step links to `/auth/reset-password?token=<resetToken>`,
but `/auth/reset-password` still runs the legacy
`ResetPasswordForm` (Supabase session-based `updateUser()`), which
does not read or consume a `?token=` query param. Until task-70
ships, this link is a placeholder destination, not a working handoff.
This does not block task-69 — the identify→verify half of the flow is
fully functional and independently testable — but the end-to-end
"reset your actual password" journey is incomplete until task-70.

## Deliberately NOT done here

- `/auth/reset-password` page consuming `resetToken` — task-70.
- Anti-enumeration, rate limiting, Gatekeeper wiring — already live
  server-side in task-66/67 (this task's UI just calls those routes).

## Status: DONE

## Verification

Could not run `npx tsc --noEmit`, `npm run dev`, or install
`node_modules` in this sandbox (no npm registry network access, same
limitation noted in every prior task in this repo). Manually checked:
JSX brace/paren balance, every import resolves to an existing export
(`getCsrfHeader` from `lib/csrf.ts`, icons from `lucide-react`,
`ToastType` from `components/shared/useToast`), and the request/
response shapes against `/initiate` and `/verify`'s actual route
source (not just the task-67 doc) to make sure field names match
exactly (`method`, `action`, `otp`, `answer`, `resetToken`).

### Manual verification steps (run locally)

1. `npm run dev`, then visit `/auth/forgot-password`.
2. Enter a real buyer's email → Continue. Expect the "Choose method"
   screen with 3 cards, the security-question card showing that
   buyer's actual question text.
3. Repeat with a made-up email → expect the identical 3 cards, with a
   generic placeholder question — no visible difference or delay
   between step 2 and this step.
4. Pick "Email" → expect a toast confirming a code was sent, and an
   email arriving with a 6-digit code within a minute.
5. Enter the code → Verify → expect a "✓ Identity verified" toast and
   a "Continue to reset password" link.
6. Enter a wrong code 3 times within a few minutes → on the 3rd,
   check `/superAdmin/gatekeeper` — device should show as banned
   (`triggerEventType: password_recovery_failed`), confirming the
   existing task-67 wiring still fires correctly through this new UI.
7. Pick "Security question" instead → confirm the real question text
   renders above the answer field, and a correct answer reaches
   "done" the same as the OTP path.
