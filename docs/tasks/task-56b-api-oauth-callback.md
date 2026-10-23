# task-56b — api-oauth-callback — GET /api/auth/oauth/callback

**Fulfills:** additional_platform_gaps_specification.md §4.3
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-56)
**Dependency:** task-56a must be [DONE]
**NEEDS:** task-56a
**SETUP:** in the Supabase dashboard, enable the Google and Facebook providers (client id + secret from each provider's console) and add `<site>/api/auth/oauth/callback` to the allowed redirect URLs, for local and production.
**FILES TO TOUCH:** app/api/auth/oauth/callback/route.ts (new), lib/loginSession.ts (existing, only if the shared cookie step needs a small export), middleware.ts (existing, only if the callback path needs allowing for logged-out users)
**DONE WHEN:**
- The route exchanges the `code` for a session, then calls `decideOAuthOutcome()` (task-56a).
- New OAuth user: role is forced to `buyer` server-side, never taken from the client; the same session cookies as a normal login are issued via the shared loginSession logic.
- Existing OAuth buyer: signed in normally.
- Any block outcome: no session cookie is left behind, the user is signed out and sent to `/auth/login?oauthError=<code>`.
- Rate limited (`rate_limit_hit` logged), and `login_success` / `login_failed` / a new `oauth_login_blocked` event go through `logSecurityEvent()`; anomaly detection runs after success like the password login.
- A device already banned by the Gatekeeper still cannot get in through this route.
- `npx tsc --noEmit` adds no new errors.

## Notes
- RISK TO VERIFY FIRST (Rule 0D, not yet checked): Supabase may auto-link a new OAuth identity to an existing email account that has the same verified email. If it does, "block" is not enough, because the identity is already attached. Check the project's linking setting and what `identities` looks like after a test sign-in. If it auto-links, the block step must also remove the new identity. Report what is found before building around it.
- Buyers only: admin and superAdmin emails must never get a session from this route, so the TOTP and Vault flows are never bypassed.
- The spec lists `/api/auth/oauth/google` with no custom route; with two providers and a block policy a custom callback is needed, so this is a deliberate deviation.
