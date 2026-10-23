# task-56a — lib-oauth-account-policy — decide what an OAuth sign-in is allowed to do

**Fulfills:** additional_platform_gaps_specification.md §4.3 (Social / OAuth Login) — with the 2026-10-24 decisions below
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-56)
**Dependency:** none
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** lib/oauthAccountPolicy.ts (new), lib/errorMessages.ts (existing, add OAuth messages — confirm the real filename first)
**DONE WHEN:**
- `decideOAuthOutcome()` takes the Supabase user's email, role, identities and provider, and returns one of: `allow_new_buyer`, `allow_existing_oauth_buyer`, `block_password_account`, `block_staff_account`, `block_no_email`.
- An email that already has a password (`email` identity) returns `block_password_account`; an admin/superAdmin role returns `block_staff_account`; a provider that returns no email returns `block_no_email`.
- Each block outcome has its own plain-language message in the central error-messages file (Rule 34.1).
- Checked with a throwaway script covering every outcome; `npx tsc --noEmit` adds no new errors.

## Notes
- Decided 2026-10-24: providers are Google and Facebook; buyers only; a matching password account is BLOCKED with a "log in with your password first" message. This replaces the spec's "prompt to link" wording and its checklist line 237.
- Facebook can return no email (phone-only accounts), hence `block_no_email`.
- Pure logic, no database or Supabase calls, so it can be tested without a running app.
