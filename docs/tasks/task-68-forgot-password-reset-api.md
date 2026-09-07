# task-68 — Forgot-password API (reset)

**Fulfills:** buyer_password_recovery_specification.md Section 4.6
(FORGOT PASSWORD FLOW, final step) and Section 5's `/reset` endpoint
definition; Rule 44 (Origin-Scoped Session Termination) per Section
4.6/6's session-invalidation requirement.
**taskPlan.md phase:** Section 8 (buyer_password_recovery_specification.md)
  — task-36 split into task-66 through task-70; this is the API-reset
  slice (also folds in old task-37's session-invalidation half, per
  the split's original note).
**Dependency:** task-67 (`/initiate` + `/verify`, issuing the raw
  resetToken) — [DONE]

## What was built

- `app/api/auth/forgot-password/reset/route.ts` (new). Takes
  `{ resetToken, newPassword }`:
  1. CSRF check (Rule 32.2).
  2. Server-side password strength validation — same rule set as
     `register/route.ts` (min 8 chars, uppercase, number, special
     character) — never trust the client-side check alone (Rule 6).
  3. Hashes the submitted token and looks it up directly against
     `BuyerRecovery.forgotPasswordResetTokenHash` (`@unique` — a
     direct lookup, not a scan). Rejects with one generic message if
     the token doesn't match any row or has passed its 10-minute
     expiry (Section 6).
  4. On success: resolves the buyer's email via
     `supabaseAdminClient.auth.admin.getUserById()`, updates the
     password via `updateUserById(userId, { password })`, clears the
     consumed resetToken fields (single-use), logs
     `password_recovery_succeeded` + `password_reset_completed`
     (reusing the legacy flow's eventType so both paths show up
     consistently in the Security Logs page), and applies Rule 44 to
     the response (expires `sb-access-token`/`sb-refresh-token`
     cookies + `Clear-Site-Data` header in production) — identical
     pattern to `app/api/auth/logout/route.ts`.

## Anti-enumeration note (different from task-67)

Unlike `/initiate` and `/verify`, this endpoint takes no email — only
a high-entropy, single-use resetToken. There is nothing to
anti-enumerate here (Rule 32.4's dummy-hash trick applies when an
*email* could reveal account existence; a resetToken either matches
a live row or it doesn't, the same as any expired-session check). A
failed lookup and an expired token return the identical generic
message, but the reasoning is "this is just how an invalid token
looks," not deliberate timing/shape matching against a dummy target.

## Supabase session-revocation behavior (flagged for developer
awareness, not a blocker)

`supabaseAdminClient.auth.admin.updateUserById()` changing a user's
password causes Supabase's GoTrue to revoke that user's existing
refresh tokens server-side, automatically, across every
device/browser they were signed into — confirmed via
`@supabase/auth-js` 2.112.0's own documentation (checked in this
session; see the "Session-revocation" GoTrueClient.d.ts comment on
`auth.api.signOut`, and Supabase's documented password-change
behavior). This is the *real* multi-device termination mechanism —
the Rule 44 cookie-expiry/Clear-Site-Data step in this route only
covers the browser tab that happens to call `/reset` (which usually
has no live session cookie of its own, since the buyer got here via
an emailed/Telegrammed link, not a logged-in session). Applied
anyway, unconditionally, per Rule 44.4's "every new logout-shaped
route gets both steps by default" requirement — matches
`app/api/auth/logout/route.ts` exactly, no lighter-weight version.

## Gatekeeper wiring

No code change needed: `password_recovery_failed` is already in
`lib/gatekeeper.ts`'s `STRIKE_EVENT_TYPES` (added ahead of task-67).
A run of 3 invalid/expired-token attempts from the same device within
24h already counts toward an automatic ban — this route logs that
eventType on every rejection, same as `/verify`.

## Deliberately NOT done here

- `/auth/forgot-password` and `/auth/reset-password` pages —
  task-69/70 (still pending).
- No changes to the legacy Supabase-native
  `app/api/auth/forgot-password/route.ts` /
  `app/api/auth/reset-password/route.ts` pair — left untouched per
  task-67's note; that's a separate developer decision.

## Status: DONE

## Verification

Could not run `npx tsc --noEmit`, `npx prisma db push`, or install
`node_modules` in this sandbox — no network access to the npm
registry or `binaries.prisma.sh` (same limitation noted in every
prior task in this repo). Manually verified:
- Brace/paren balance on the new file (49/49, 63/63).
- All imports (`prisma`, `supabaseAdminClient`, `logSecurityEvent`,
  `isValidCsrfRequest`, `hashResetToken`) resolve to existing exports
  — checked each source file directly.
- `@supabase/auth-js@2.112.0`'s bundled type declarations fetched and
  inspected directly to confirm `updateUserById(uid, { password })`
  is the correct call shape (no separate "sign out all sessions by
  user id" method exists in this SDK version — `auth.admin.signOut()`
  takes a JWT, not a user id, which is why the note above documents
  the password-change-revokes-sessions behavor instead of an explicit
  extra call).
- `BuyerRecovery.forgotPasswordResetTokenHash` confirmed `@unique` in
  `prisma/schema.prisma` (line 567) — `findUnique` is the correct
  Prisma call, not `findFirst`.

Run `npx prisma db push && npx prisma generate` locally if not
already current since task-66 (no new schema fields were added by
this task — it only reads/writes existing `BuyerRecovery` columns).

### Manual verification steps (run locally)

1. Complete task-67's steps 1–5 to obtain a real `resetToken` for a
   test buyer account.
2. `POST /api/auth/forgot-password/reset` with
   `{ resetToken: "<token>", newPassword: "NewPass123!" }` → expect
   `success: true` and the message "Your password has been reset...".
3. Attempt to log in with the buyer's OLD password → expect failure
   (`login_failed`).
4. Log in with the NEW password (`NewPass123!`) → expect success.
5. Re-submit the SAME `resetToken` from step 2 again → expect
   `success: false`, "This reset link is invalid or has expired..."
   (token was cleared on first use).
6. Check the Security Logs page (`/superAdmin/security-logs`),
   filtered by the buyer's email → confirm both
   `password_recovery_succeeded` and `password_reset_completed` rows
   appear with the same timestamp window.
7. Submit `/reset` 3 times with a made-up/expired token within a few
   minutes → on the 3rd, check `/superAdmin/gatekeeper` — the device
   should show as banned (`triggerEventType: "password_recovery_failed"`).
