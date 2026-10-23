# task-56b — api-oauth-callback — GET /api/auth/oauth/callback

**Fulfills:** additional_platform_gaps_specification.md §4.3
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-56)
**Dependency:** task-56a must be [DONE]
**NEEDS:** task-56a
**SETUP:** in the Supabase dashboard (Authentication): (1) enable the Google and Facebook providers with the client id and secret from each provider's console; (2) add `<site>/api/auth/oauth/callback` to the allowed redirect URLs, for local and production; (3) turn ON "Enable Manual Linking" (needed to remove a wrongly attached identity). Make sure `APP_URL` is set in `.env.local`.
**FILES TO TOUCH:** app/api/auth/oauth/start/route.ts (new), app/api/auth/oauth/callback/route.ts (new), lib/oauthPkce.ts (new), lib/oauthAccountPolicy.ts (existing, added error codes), lib/errorMessages.ts (existing, added messages + `getOAuthErrorMessage`)
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
- Built 2026-10-24. Shipped as one unit with the start route and `lib/oauthPkce.ts`, because the callback cannot work without them (Rule 8A). The start route is a deviation from the spec's browser-side `signInWithOAuth`: the whole flow runs on the server so Supabase tokens never touch browser JavaScript or localStorage (Rule 18.4). The PKCE verifier travels in a short HttpOnly cookie (SameSite lax, only sent to `/api/auth/oauth/*`), and that cookie is what ties a callback to the browser that started it.
- RESOLVED (docs checked 2026-10-24): Supabase DOES auto-link identities that share a verified email, always. So a sign-in with a password account's email arrives already linked. The route reads the identities, blocks, then removes the identity that was just attached (only if it is under 2 minutes old, and only if the account has 2 or more). Removing needs "Enable Manual Linking" on, and the user signed in — hence the throwaway session is kept until after the removal.
- Blocked sign-ins end only that one session (`signOut` scope local). The default would sign the real owner out everywhere.
- Success returns a small HTML page that moves on by itself, not a 302: the session cookies are SameSite strict and a redirect that began on the provider's site would not carry them. Not yet confirmed in a real browser.
- Checked 2026-10-24 without Supabase or a browser: the PKCE round trip with the real helper (verifier survives the cookie, a missing verifier is reported, tampered or oversized cookies and planted session keys are rejected, provider allow-list) passed 13 of 13; all five files type-check with no errors in them (the only errors printed were in existing files, from dependencies missing in the sandbox). The routes themselves were not run.
- `middleware.ts` needed no change: `/api/auth/:path*` is already matched, so the Gatekeeper ban check covers both routes, and no auth branch touches them.
