# task-56c — ui-oauth-buttons — "Continue with Google / Facebook" on login and register

**Fulfills:** additional_platform_gaps_specification.md §4.3
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-56)
**Dependency:** task-56b must be [DONE]
**NEEDS:** task-56b
**SETUP:** none
**FILES TO TOUCH:** components/auth/OAuthButtons.tsx (new), lib/hooks/useOAuthSignIn.ts (new), app/auth/login/page.tsx (existing), app/styles/ (new or existing auth CSS — confirm), app/styles/mediaQueries.css (existing)
**DONE WHEN:**
- Both the Sign In and Register tabs show two buttons, "Continue with Google" and "Continue with Facebook", with inline SVG icons (Rule 17.3).
- Clicking one sends the browser to `/api/auth/oauth/start?provider=google` (or `facebook`) through the hook — a plain navigation, no Supabase browser client and no tokens in JavaScript (changed after task-56b: the server runs the whole flow).
- Buttons disable while redirecting, are at least 44px tall, and have hover, focus and active states (Rules 29, 33.3).
- `/auth/login?oauthError=<code>` shows `getOAuthErrorMessage(code)` from `lib/errorMessages.ts` as a toast (codes: password_account, staff_account, no_email, rate_limited, unusual_activity, generic); unknown codes show the generic message.
- Checked at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.
