# task-56d — ui-oauth-recovery-setup — recovery setup for buyers who signed up with OAuth

**Fulfills:** additional_platform_gaps_specification.md §4.3 (first sign-in goes through the same onboarding as registration) + buyer_password_recovery_specification.md §2
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-56)
**Dependency:** task-56b must be [DONE]
**NEEDS:** task-56b
**SETUP:** none
**FILES TO TOUCH:** app/auth/register/recovery-setup/ (existing, exact files to be listed after viewing), lib/recoverySetup.ts (existing), the recovery-setup API routes (existing, only if the email step needs a flag set)
**DONE WHEN:**
- A new OAuth buyer lands on the blocking recovery-setup screen exactly like a registered buyer; middleware still gates `/buyer/*` until `recoverySetupComplete` is true.
- Because the provider already verified the email, the email step is marked done for that buyer and not asked again; Telegram and the security question are still required.
- A password-registered buyer's flow is unchanged.
- `npx tsc --noEmit` adds no new errors.

## Notes
- NEEDS DEVELOPER APPROVAL BEFORE BUILDING: this treats the provider's verified email as satisfying Rule 48.1 step 1. That is a small change from "all 3 required, no skip". Confirm, or keep the email step for everyone.
