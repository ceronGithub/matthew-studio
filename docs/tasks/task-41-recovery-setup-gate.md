# task-41 — recoverySetupComplete flip + middleware blocking gate

**Fulfills:** buyer_password_recovery_specification.md Section 2
(lines 19 and 88: "no way to reach /buyer/dashboard without completing
it — enforced in middleware.ts by checking a recoverySetupComplete
flag")
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md) —
  Telegram half, part 4 of 4 (middleware)
**Dependency:** task-38 (schema), task-39 (API), task-40 (UI) — all
  [DONE]

## Numbering note

This task number was flagged as colliding with a second, unrelated
`task-41` under item 4 (admin_account_specification.md — Analytics)
in docs/taskPlan.md. Per developer confirmation, this file claims the
number `41`; the Analytics task still needs to be renumbered before
its own file is created. See docs/taskPlan.md's NOTES section.

## What was built

- `lib/recoverySetup.ts` (new) — `isRecoverySetupComplete(userId)`,
  read-only lookup on `BuyerRecovery.recoverySetupComplete`. Fails
  OPEN on a DB error (same convention as `lib/gatekeeper.ts`'s
  `checkDeviceBan`); treats a missing row as NOT complete (expected
  state for a buyer who hasn't started setup).
- `app/api/auth/recovery-setup/security-question/route.ts` (modified)
  — this is the last of the 3 setup steps. Now reads the existing
  `BuyerRecovery` row's `emailVerifiedForRecovery` and `telegramChatId`
  before the upsert, computes `allStepsComplete`, and writes
  `recoverySetupComplete` accordingly in the same upsert that saves
  the security question. Logs a separate `recovery_setup_completed`
  SecurityLog event when the flip happens (distinct from the existing
  `recovery_setup_security_question_saved` event). Response now
  includes `recoverySetupComplete` in `data`.
- `middleware.ts` (modified) — new branch, right after the existing
  `/buyer` + role-mismatch check: if `role === "buyer"` and
  `isRecoverySetupComplete(data.user?.id)` is false, redirect to
  `/auth/register/recovery-setup` instead of letting the request
  through. Applies to every `/buyer/*` route, not only
  `/buyer/dashboard`, per the spec's own broader intent (a buyer who
  bookmarks `/buyer/orders` directly shouldn't skip the gate either).
  `/auth/register/recovery-setup` itself is matched by the `/auth/*`
  pattern, not `/buyer/*`, so it's never caught by its own gate.

## Deliberately NOT done here

- The `/auth/forgot-password` and `/auth/reset-password` flows
  (task-36/37) — this task only covers the post-registration setup
  gate, not the separate "I'm locked out, help me recover" flow.

## Status: DONE

## Verification

`npx tsc --noEmit` — no new errors introduced by `lib/recoverySetup.ts`,
the security-question route, or `middleware.ts` (confirmed by grepping
the full type-check output for these three files specifically — zero
matches). The type-check run as a whole still reports its usual
pre-existing errors, all in unrelated files, caused by this sandbox
not being able to reach `binaries.prisma.sh` to run `npx prisma
generate` (network-restricted environment) — not something this task
introduced or can fix from here. Run `npx prisma generate` locally
before trusting a full green `tsc` pass.
