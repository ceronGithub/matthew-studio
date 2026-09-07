# task-67 — Forgot-password API (initiate + verify)

**Fulfills:** buyer_password_recovery_specification.md Section 4
(FORGOT PASSWORD FLOW, Steps 1–3) and Section 5's `/initiate` and
`/verify` endpoint definitions; Section 6's rate-limiting/SecurityLog/
Gatekeeper requirements.
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md)
  — task-36 split into task-66 through task-70; this is the API-verify
  slice.
**Dependency:** task-66 (schema + `lib/passwordResetToken.ts`) — [DONE]

## What was built

- `lib/getUserByEmail.ts` (new) — `getUserIdByEmail(email)`, resolving
  a Supabase Auth userId from an email. Same listUsers-and-match
  approach `app/api/auth/check-email/route.ts` already uses (Supabase's
  admin API has no exact-email filter). Pulled into its own file so
  both new routes below share one implementation instead of
  duplicating it.
- `app/api/auth/forgot-password/initiate/route.ts` (new) — Step 1→2.
  Takes `{ email }`, always returns the same shape: the 3 fixed method
  cards (`email`, `telegram`, `security_question`) plus either the
  buyer's real question text (Section 4.2) or a generic placeholder if
  the email doesn't match an account or hasn't set one — same
  code path and DB-call shape either way, so timing can't distinguish
  the two cases (Rule 32.4's dummy-hash principle applied to a lookup
  instead of a hash). Logs `password_recovery_initiated`.
- `app/api/auth/forgot-password/verify/route.ts` (new) — Step 3, all
  three methods. See "Spec deviation" below for its `action` field.
  - `action: "send"` (email/telegram only) — generates a 6-digit OTP
    (`lib/passwordResetToken.ts`), stores it on `BuyerRecovery`, and
    delivers it via `sendEmail()` (reusing `EMAILJS_TEMPLATE_ID_RECOVERY_OTP`,
    the same template `recovery-setup/email` uses) or
    `sendTelegramMessage()`. Always returns the same generic
    `{ sent: true }` response — including when the account, the
    OTP-resend cooldown, or the Telegram link doesn't exist — so this
    step reveals nothing either.
  - `action: "verify"` — checks the OTP hash (email/telegram) or
    bcrypt-compares the security answer (falling back to a dummy
    bcrypt hash when there's no real one to compare against, so a
    nonexistent account costs the same bcrypt round-trip as a wrong
    answer). On success: generates + hashes a resetToken (10-minute
    expiry per Section 6), clears the consumed OTP fields, logs
    `password_recovery_succeeded`, and returns the raw resetToken —
    the only time it's ever sent in the clear. On failure: logs
    `password_recovery_failed` and returns a generic
    "Incorrect code/answer" message.
- Both routes: CSRF check first, then `checkRateLimit()` called twice
  (once keyed by IP, once by email) under the shared `"forgot-password"`
  endpoint label — the same label the legacy
  `app/api/auth/forgot-password/route.ts` does NOT use (see "Legacy
  route" note below), so this is a fresh, isolated 5-attempts/15-min
  budget covering both `/initiate` and `/verify` combined, satisfying
  Section 6's "combined across all three methods" requirement.

## Gatekeeper wiring

No code change needed: `lib/gatekeeper.ts`'s `STRIKE_EVENT_TYPES`
already includes `password_recovery_failed` (added in an earlier
pass, ahead of this task). `logSecurityEvent()` calls
`evaluateGatekeeperTriggers()` on every write, so every failed verify
attempt already counts toward the 3-strike/24h device ban
automatically.

## Spec deviation (flagged for developer review)

Section 5's documented request/response shapes for `/verify` have no
"send the OTP" step — only `{ email, method, otp | answer }`. But
Section 4.3/4.4 requires the backend to actively send a code once a
method is picked, and no other endpoint in Section 5 does that. Built
`/verify` with an `action: "send" | "verify"` dispatch instead of
leaving that gap unbuilt — the same pattern
`/api/auth/recovery-setup/email/route.ts` already established for an
identical "one endpoint, two actions" situation. `security_question`
has no send step; the UI calls `action: "verify"` directly once the
buyer types an answer. If the developer wants this split into two
literal endpoints matching Section 5 more closely, that's a follow-up
refactor, not a blocker for task-68/69/70.

## Legacy route note (not touched, flagged for developer review)

`app/api/auth/forgot-password/route.ts` and
`app/api/auth/reset-password/route.ts` already exist and implement a
**different, Supabase-native** reset flow (`supabaseServerClient.auth.
resetPasswordForEmail()` + a magic-link session on the client). That
system is unrelated to the one this task builds (`BuyerRecovery`-based,
3-method, task-66/67/68) and the two will coexist without a routing
conflict (different exact paths: `/forgot-password` vs
`/forgot-password/initiate`+`/verify`). Left untouched — deciding
whether to retire the legacy Supabase flow once task-69/70 ship a UI
for the new one is a developer decision, not something to resolve
silently inside this task.

## Deliberately NOT done here

- The actual password update (`/api/auth/forgot-password/reset` +
  Rule 44 session invalidation) — task-68.
- `/auth/forgot-password` and `/auth/reset-password` pages — task-69/70.

## Status: DONE

## Verification

`npx tsc --noEmit` — no new error categories introduced; the full
run only shows the same pre-existing "Cannot find module" /
"Cannot find name 'process'/'crypto'/'Buffer'" errors caused by this
sandbox having no `node_modules` installed (no network access to the
npm registry here — same limitation noted in task-41/task-66), plus
one pre-existing-pattern `TS7006` on the `.find((user) => ...)`
callback that `check-email/route.ts` already has for the identical
reason (Supabase types unavailable). Also syntax-checked all three
new/changed files directly with Node's own parser — clean.

Could not run `npx prisma db push` / `generate` in this sandbox
(`binaries.prisma.sh` network-blocked, same as every prior task).
Run `npx prisma db push && npx prisma generate` locally before
building task-68 if that hasn't already been done since task-66.

### Manual verification steps (run locally after `db push`/`generate`)

1. Start the dev server (`npm run dev`) and confirm
   `npx prisma db push && npx prisma generate` has been run at least
   once since task-66's schema changes landed.
2. `POST /api/auth/forgot-password/initiate` with a real buyer's
   email → expect `success: true` with the buyer's actual security
   question text in `data.questionText`.
3. Repeat step 2 with a made-up email → expect the exact same
   response shape, just with the generic placeholder question text —
   and roughly the same response time as step 2 (no obvious delay
   difference).
4. `POST /api/auth/forgot-password/verify` with
   `{ email, method: "email", action: "send" }` for the real buyer →
   confirm an email arrives with a 6-digit code within a minute.
5. `POST /api/auth/forgot-password/verify` with
   `{ email, method: "email", action: "verify", otp: "<the code>" }`
   → expect `success: true` and a `data.resetToken` string.
6. Repeat step 5 with a wrong code → expect `success: false`,
   "Incorrect code. Please try again.", and a new
   `password_recovery_failed` row in the Security Logs page filtered
   by that email.
7. Repeat step 6 two more times within a few minutes (3 total
   failures) → on the 3rd, check `/superAdmin/gatekeeper` — the
   device should now show as banned (strikeCount 3,
   triggerEventType `password_recovery_failed`).
