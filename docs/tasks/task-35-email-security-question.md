# task-35 (half A) — Email OTP + Security Question recovery setup

**Spec:** buyer_password_recovery_specification.md Section 2.1 / 2.3 / 5
**Status:** DONE (this half only — Telegram linking + the
`recoverySetupComplete` middleware gate are the remaining half,
blocked on `TELEGRAM_BOT_TOKEN`/`TELEGRAM_BOT_USERNAME`)

## What was built

- `prisma/schema.prisma` — added `emailOtpCodeHash`, `emailOtpExpiresAt`,
  `emailOtpSentAt` to `BuyerRecovery` (task-34 already had the model).
- `lib/emailOtp.ts` — 6-digit code generation + SHA-256 hashing
  (ephemeral-secret convention, not bcrypt — see file header).
- `lib/securityQuestions.ts` — shared Question Bank (Section 2.3.1),
  single source of truth for both the UI dropdown and server-side
  validation.
- `app/api/auth/recovery-setup/email/route.ts` — `send`/`verify`
  actions, 60s resend cooldown, 10-min OTP expiry, rate-limited
  (5/15min), logs `recovery_setup_email_otp_sent` /
  `_failed` / `recovery_setup_email_verified` to SecurityLog.
- `app/api/auth/recovery-setup/security-question/route.ts` — bcrypt
  hashes the answer (Rule 18.2/32.4 discipline), rate-limited,
  logs `recovery_setup_security_question_saved`.
- `components/auth/RecoverySetupWizard.tsx` — 2-step wizard UI
  (Telegram step deliberately not shown — see file header).
- `app/auth/register/recovery-setup/page.tsx` — page shell.
- `app/styles/recoverySetup.css` — step indicator + select field
  styles, extends `auth.css` tokens.
- `components/auth/RegisterForm.tsx` — redirects to
  `/auth/register/recovery-setup` instead of `/buyer/dashboard`
  after successful registration.
- `package.json` — added `bcryptjs` + `@types/bcryptjs`.

## Deliberately NOT done in this half

- Telegram deep-link, OTP capture, bot webhook (Section 2.2).
- Flipping `recoverySetupComplete = true` (spec requires all 3 steps
  — flipping it after only 2 would be incorrect per Section 2.4).
- `middleware.ts` blocking gate (Section 2's "no way to reach
  `/buyer/dashboard` without completing it") — would strand buyers
  today since Telegram isn't buildable yet without your bot token.
- Gatekeeper strike wiring for failed attempts here — Section 6's
  `password_recovery_failed` strike trigger applies to the Section 4
  forgot-password flow (task-36/37), not this setup flow.

## Still needed from you before the Telegram half can be built

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (create a bot via
  @BotFather on Telegram).
- An `EMAILJS_TEMPLATE_ID_RECOVERY_OTP` template in your EmailJS
  dashboard with `to_email` and `otp_code` variables (see
  overviewProject.txt's env var section).

## Verification

`npx tsc --noEmit` — 21 pre-existing errors (ungenerated `@prisma/client`
types + unrelated implicit-any in lib/anomalyDetection.ts and
lib/gatekeeper.ts), zero new errors from any file touched here.
`npx prisma generate`/`db push` were not runnable in this sandbox (no
DB credentials, and binaries.prisma.sh is blocked here) — run both
locally before testing.
