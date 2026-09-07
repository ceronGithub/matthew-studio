# task-34 — Recovery data model additions (BuyerRecovery)

**(reconciled from existing docs/tasks file — verify against Layer-3 audit)**
This file did not exist before this reconciliation pass, even though
`taskPlan.md` already listed task-34 as `[DONE]`. Back-filled per Rule
49.1 Rule 1 by cross-referencing `taskPlan.md`'s own description,
`prisma/schema.prisma`, `overviewProject.txt`, and `overviewProject-2.txt`
— not from a fresh build.

**Fulfills:** buyer_password_recovery_specification.md Section 2
(POST-REGISTRATION SETUP, data model) and Rule 48.2's field list.
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md),
  first sub-task — precedes task-35 (email + security-question setup
  wizard) and task-38–41 (Telegram split).
**Dependency:** none (first task in this spec's build order).

## What was verified as built (Three-Layer Audit)

| Layer | Check | Result |
|---|---|---|
| Spec | Section 2 / Rule 48.2 field list | ✅ |
| Schema | `model BuyerRecovery` in `prisma/schema.prisma` (line 500) | ✅ |
| Code Wired | `prisma.buyerRecovery` queried in 8 files | ✅ |

**Code-wired call sites confirmed via grep:**
- `app/api/auth/forgot-password/initiate/route.ts`
- `app/api/auth/forgot-password/verify/route.ts`
- `app/api/auth/forgot-password/reset/route.ts`
- `app/api/auth/recovery-setup/security-question/route.ts`
- `app/api/auth/recovery-setup/telegram/link/route.ts`
- `app/api/auth/recovery-setup/email/route.ts`
- `app/api/telegram/webhook/route.ts`
- `lib/recoverySetup.ts`

## What the model contains (per schema.prisma, as reconciled)

- `recoverySetupComplete` (Boolean) — the middleware-gate flag.
- Email recovery: `emailVerifiedForRecovery`, `emailOtpCodeHash`,
  `emailOtpExpiresAt`, `emailOtpSentAt`.
- Telegram recovery: `telegramChatId` (`@unique`), `telegramLinkedAt`,
  plus in-progress linking fields (`telegramLinkToken`,
  `telegramLinkTokenExpiresAt`, `telegramOtpCodeHash`,
  `telegramOtpExpiresAt`, `telegramOtpSentAt`).
- Security question: `securityQuestionId`, `securityAnswerHash`.
- Forgot-password fields (Section 4 / task-66) live on this same
  model, added by a later task — not part of task-34's original scope.

## Deviation from the literal spec (per taskPlan.md's own note, carried forward)

Built as a new `userId`-keyed `BuyerRecovery` table rather than the
spec's literal `model Buyer` block, since this repo has no local
Buyer/User table (auth is Supabase-native). Documented at the time in
`prisma/schema.prisma`'s header comment and `overviewProject-2.txt`.

## Telegram bot env vars

`TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` confirmed documented in
`overviewProject.txt`'s Environment Variables section (server-only,
from @BotFather per Rule 48.5).

## Status: DONE (reconciled)

## Note on this reconciliation

No code changes were made in this pass — this file only restores
traceability for work that was already live. If any of the above
turns out to be inaccurate on a future audit, correct this file and
`taskPlan.md`/`overviewProject.txt` Section 5C together in the same
turn, per Rule 16.1.
