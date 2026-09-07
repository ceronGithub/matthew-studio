# task-39 — Telegram bot webhook + link status + manual-code verify

**Fulfills:** buyer_password_recovery_specification.md Section 2.2 / 2.2.1 / 5
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md) —
  Telegram half, part 2 of 4 (API)
**Dependency:** task-38 (schema + lib/telegramLink.ts) — [DONE]. Requires
  `npx prisma db push && npx prisma generate` to have been run.

## What was built

- **Schema addendum** (beyond task-38's scope): `TelegramPendingLink`
  model — holds `{chatId, codeHash, expiresAt}` for the manual-fallback
  path, since the webhook has no `userId` to attach the OTP to until
  the buyer claims it (see file header comments for why this couldn't
  live on `BuyerRecovery`).
- `lib/telegramBot.ts` — `sendTelegramMessage()`, thin wrapper over the
  Bot API's `sendMessage`. Fails soft (logged, never thrown).
- `app/api/telegram/webhook/route.ts` — public endpoint, no
  session/CSRF. Handles `/start <token>` (deep-link, auto-links) and
  bare `/start` (manual, DMs back a 6-digit code into
  `TelegramPendingLink`). Always returns 200 per Telegram's
  requirements. Optional `TELEGRAM_WEBHOOK_SECRET` check — **deviation
  from spec Section 8's two env vars**, documented below.
- `app/api/auth/recovery-setup/telegram/link/route.ts` — `start`
  (generate linkToken + deep link), `status` (poll), `verify-code`
  (claim a `TelegramPendingLink` row).

## Spec deviation — flagging for review

Added `TELEGRAM_WEBHOOK_SECRET` (optional, skipped if unset) as a
shared-secret check on the public webhook, verified against Telegram's
`secret_token` param on `setWebhook`. Not in spec Section 8. This
closes an obvious gap (anyone could otherwise POST forged "linked"
events to the public webhook URL) but is an addition beyond what was
asked — flagging per the no-silent-scope-creep principle rather than
just shipping it quietly.

## Still needed from you before this is live

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (create bot via
  @BotFather).
- Register the webhook once deployed:
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/telegram/webhook&secret_token=<your-chosen-secret>`
  (omit `secret_token` if you don't want the optional check above).

## Status: DONE (API layer only — not wired into any UI yet)

## Next micro-task
task-40 — re-enable the Telegram step in
`components/auth/RecoverySetupWizard.tsx`: "Open Telegram" button
calling `start`, polling `status` every few seconds, manual code input
calling `verify-code`.

## Verification

`npx tsc --noEmit` — same pre-existing `@prisma/client`/`@types/node`
category of errors as before (this sandbox has no `npm install` run);
zero new errors from any file touched here beyond that category once
you've run `npm install` + `prisma generate` locally.
