# task-40 — Wire Telegram step into RecoverySetupWizard

**Fulfills:** buyer_password_recovery_specification.md Section 2.2
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md) —
  Telegram half, part 3 of 4 (UI)
**Dependency:** task-39 (webhook + link API routes) — [DONE]

## What was built

- `components/auth/RecoverySetupWizard.tsx` — rewritten to a 3-step
  flow (email → telegram → security-question → done). New "telegram"
  step: auto-requests a deep link on entry (`action: "start"`), polls
  `action: "status"` every 3s, shows the numbered instructions from
  spec 2.2, an "Open Telegram" button, and a manual 6-digit code
  fallback field (`action: "verify-code"`). Either path sets
  `telegramLinked`, which advances to `security-question`.
- `app/styles/recoverySetup.css` — added `.recoverySetupTelegramSteps`
  for the numbered instruction list.

## Deliberately NOT done here

- `recoverySetupComplete = true` flip — still task-41 (needs all 3
  steps confirmed server-side, not just client-side step progression).
- `middleware.ts` blocking gate — task-41.

## Status: DONE (UI layer only)

## Next micro-task
task-41 — flip `recoverySetupComplete` after step 3 succeeds (belongs
in the security-question route, since that's the last of the 3 steps)
+ `middleware.ts` gate blocking `/buyer/dashboard` until it's true.

## Verification

`npx tsc --noEmit` — no new errors from this file (uses only existing
hooks/imports already used elsewhere in the same file).
