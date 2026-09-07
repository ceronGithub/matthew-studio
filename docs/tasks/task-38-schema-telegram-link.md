# task-38 — Telegram link token + manual-code schema fields

**Fulfills:** buyer_password_recovery_specification.md Section 2.2 / 2.2.1 / 3
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md) —
  Telegram half, part 1 of 4 (schema)
**Dependency:** task-34 (BuyerRecovery table) — [DONE]

## What was built

- `prisma/schema.prisma` — added to `BuyerRecovery`: `telegramLinkToken`
  (+ expiry), `telegramOtpCodeHash` (+ expiry/sentAt) — the deep-link
  and manual-fallback secrets from Section 2.2.1. `telegramChatId`/
  `telegramLinkedAt` already existed from task-34.
- `lib/telegramLink.ts` — token/OTP generation, hashing, deep-link URL
  builder (`buildTelegramDeepLink`, returns `null` if
  `TELEGRAM_BOT_USERNAME` isn't set yet).

## Status: DONE (schema + lib layer only)

## Next micro-task
task-39 — bot webhook route (captures `chat_id`), link-status poll
route, manual-code verify route. Blocked on `TELEGRAM_BOT_TOKEN` for
live testing (code will reference the env var; you'll need to run
`npx prisma db push && npx prisma generate` before task-39's routes
will compile against the new fields).
