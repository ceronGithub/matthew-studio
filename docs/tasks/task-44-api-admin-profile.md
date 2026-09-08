# task-44 (API half) — Admin Profile: self-service settings API

**Fulfills:** admin_account_specification.md Section 3.8 — My Profile
& Account Settings (`/admin/profile`), API half only. UI half
(task-44 UI) is a separate, not-yet-built follow-up.

**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 4
(admin_account_specification.md), the line directly after task-43.

**Dependency:** None blocking — `getSessionAdmin()`,
`isValidCsrfRequest()`, `processImage()`/`uploadToR2()`/
`deleteFromR2()`, `logSecurityEvent()`, and `recordAccountActivity()`
all already existed. Blocks task-44 (UI half), which calls these
routes.

---

## What was built

- `app/api/admin/profile/route.ts` — `GET`/`PUT`. Returns fullName,
  avatarUrl, email (read-only), role (read-only), permissions
  (read-only — empty array for super-admin, whose access isn't
  permission-gated), createdAt (read-only), and notificationPrefs.
  `PUT` updates fullName only — merges into existing
  `user_metadata`, never replaces it. Mirrors
  `app/api/buyer/profile/route.ts`'s pattern exactly (no local
  Admin/User table — Supabase Auth `user_metadata` is the store).
- `app/api/admin/profile/avatar/route.ts` — `POST`. Same
  resize/compress/WebP-convert/upload/delete-previous flow as
  `app/api/buyer/profile/avatar/route.ts` (Rule 35.6), scoped to the
  admin session and keyed `avatars/{admin.id}/...` in R2.
- `app/api/admin/profile/password/route.ts` — `PUT`. Verifies the
  submitted current password via a real
  `supabaseServerClient.auth.signInWithPassword()` call (never a
  client-side-only check, Rule 6) before accepting a new one.
  Validates new-password strength with the same rule set as
  `register/route.ts` and `forgot-password/reset/route.ts`. Logs
  `password_reset_completed` to SecurityLog and `profile_updated` to
  the Rule 42 Account Activity Log. Flagged in the file header:
  Supabase revokes every refresh token (not just other devices') the
  moment the password changes, so "current session stays active" per
  the spec only holds until the current access token's own natural
  expiry — a true per-device model needs Rule 32.3's refresh-token
  rotation, out of scope here.
- `app/api/admin/profile/notifications/route.ts` — `PUT`. Single-key
  toggle save (`{ key, value }`) into
  `user_metadata.notificationPrefs`, since Section 3.8 saves each
  toggle immediately rather than through the main "Save Profile"
  button.

## Known gaps / next task

- UI half (task-44 UI, not started): `/admin/profile` page +
  `AdminProfileForm`/`AdminPasswordChangeForm`/
  `AdminNotificationPreferences` components + `useAdminProfile` hook,
  same shape as the buyer profile page's components.
- No dedicated shared `lib/passwordPolicy.ts` yet — `isPasswordStrongEnough`
  is now duplicated a third time (register, forgot-password/reset,
  this route). `forgot-password/reset/route.ts`'s header comment
  already flagged this as worth consolidating once a third call site
  showed up; flagging again here rather than editing those two
  unrelated files as an unrequested refactor.
