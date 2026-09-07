# task-66 — Forgot-password schema + shared token/OTP helpers

**Fulfills:** buyer_password_recovery_specification.md Section 3 (data
model, extended) and Section 6 (resetToken single-use/10-minute
expiry) — the schema half of Section 4's forgot-password flow.
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md)
  — task-36 split into task-66 through task-70 (schema/API-verify/
  API-reset/UI-forgot-password/UI-reset-password), same "split a
  multi-layer task into layer-per-task micro-tasks" pattern as the
  task-38→41 Telegram split.
**Dependency:** task-34 (BuyerRecovery table) — [DONE]

## Numbering note

task-65 is reserved for the still-unresolved admin_account_specification.md
Analytics task (see docs/taskPlan.md NOTES — flagged during task-41).
This split starts at task-66 to avoid re-colliding with that reservation.

## What was built

- `prisma/schema.prisma` (modified) — `BuyerRecovery` gained:
  - `forgotPasswordOtpMethod` / `forgotPasswordOtpCodeHash` /
    `forgotPasswordOtpExpiresAt` / `forgotPasswordOtpSentAt` — one
    shared triplet for whichever of the two OTP-based recovery
    methods (email or telegram, Section 4.3/4.4) the buyer picks;
    kept separate from the Section 2 setup fields on purpose (see
    inline schema comment — different security context, avoids a
    race with an in-progress Telegram re-link).
  - `forgotPasswordResetTokenHash` (`@unique`) /
    `forgotPasswordResetTokenExpiresAt` — the Section 4.6 resetToken,
    hashed before storage (unlike `telegramLinkToken`, which is
    stored raw since a webhook matches it directly) because this
    token alone is enough to change the buyer's password.
- `lib/passwordResetToken.ts` (new) — `generateForgotPasswordOtpCode`/
  `hashForgotPasswordOtpCode`/`forgotPasswordOtpCodeMatches` (mirrors
  `lib/emailOtp.ts`'s SHA-256 convention) and
  `generateResetToken`/`hashResetToken`/`resetTokenMatches` for the
  reset token. Exports `FORGOT_PASSWORD_OTP_EXPIRY_MINUTES` (5, per
  Section 4.3/4.4 — shorter than the 10-minute setup OTP) and
  `FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` (10, per Section 6).

## Deliberately NOT done here

- No new schema for per-account rate limiting — the existing
  `lib/rateLimit.ts`'s `checkRateLimit(key, endpoint, max, window)`
  is generic enough to reuse as-is: call it once with the IP as
  `key` and once with the email as `key`, both under the same
  `"forgot-password"` endpoint label, satisfying Section 6's
  "per IP AND per account, combined across all three methods."
  That wiring belongs in task-67 (the API layer), not here.
- The actual `/api/auth/forgot-password/*` routes — task-67.
- The `/auth/forgot-password` and `/auth/reset-password` pages —
  task-69/70.

## Status: DONE

## Verification

`npx tsc --noEmit` — zero new errors from `lib/passwordResetToken.ts`
(confirmed via targeted grep on the full output). Could not run
`npx prisma validate` or `npx prisma generate` in this sandbox —
`binaries.prisma.sh` is network-blocked here (same limitation noted
in task-41). Run `npx prisma db push && npx prisma generate` locally
before building task-67 against these new fields.
