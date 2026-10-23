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

## Notes
- Built 2026-10-24. New: components/auth/OAuthButtons.tsx, lib/hooks/useOAuthSignIn.ts, components/auth/OAuthErrorNotice.tsx. Edited: components/auth/SignInForm.tsx, components/auth/RegisterForm.tsx, app/auth/login/page.tsx, app/styles/auth.css.
- DEVIATION 1 (new file): ?oauthError handling is its own small component, OAuthErrorNotice.tsx, copied from the IdleLogoutNotice pattern. `useSearchParams` needs a Suspense boundary, and the page already has one around IdleLogoutNotice; putting it inside the buttons would have needed a second one.
- DEVIATION 2 (where the buttons render): inside the end of each form (SignInForm, RegisterForm), not in page.tsx. The Sign In form swaps to the TOTP step by returning different markup, so the buttons vanish there on their own. In page.tsx they would stay visible during an admin's TOTP step. Cost: one import and one line in each form. The buttons are type="button", so they never submit the form.
- app/styles/mediaQueries.css was NOT changed: the card is already width 340px with max-width calc(100% - 2rem), the buttons are full width and 44px tall, so nothing needed a breakpoint.
- Checked without a browser: server-rendered OAuthButtons shows both labels, two type="button" buttons, two inline SVGs, none disabled; getOAuthErrorMessage returns the right text for all 5 codes and the generic text for "bogus", "" and null; project tsc error set identical to before (51, all Prisma-type errors from a sandbox that could not run `prisma generate`); eslint clean on the new and edited files except one error in RegisterForm.tsx line 74 that was already there before this task.
- NOT checked: real browser (layout over the slideshow, the three widths, focus ring, toast), and the live sign-in (still depends on task-56b's dashboard setup).
