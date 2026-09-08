# task-44 (UI half) — Admin Profile page

**Fulfills:** admin_account_specification.md, Section 3.8 — "My
Profile & Account Settings (/admin/profile)": self-service name,
avatar, password, and notification-preference management so an admin
doesn't need super-admin involvement for these changes.

**taskPlan.md phase:** PHASE 3 (remainder) — ADMIN & SUPER-ADMIN
OVERSIGHT, item 4 (admin_account_specification.md) — the last
remaining line in that item; closing it flips item 4's parent line to
[DONE] (Rule 49.1 Rule 6).

**Dependency:** task-44 (API half) [DONE] — `GET`/`PUT
/api/admin/profile`, `POST /api/admin/profile/avatar`, `PUT
/api/admin/profile/password`, `PUT /api/admin/profile/notifications`
all already existed and required no changes; this task only adds the
consuming UI.

---

## What changed

- `lib/hooks/useAdminProfile.ts` — new client fetch/mutation hook.
  Mirrors `lib/hooks/useBuyerProfile.ts`'s shape (loading/error state
  for the initial fetch, per-mutation success/message returns), with
  the admin-only additions the buyer hook has no equivalent for:
  read-only `role`/`permissions`, a separate `changePassword` mutation
  (current-password re-entry, never touches local profile state), and
  `saveNotificationPref(key, value)` for the per-toggle immediate
  saves Section 3.8 calls for (no batch save).
- `components/admin/ProfileForm.tsx` — new client form component,
  same manual `useState` + `validate()` pattern as
  `components/buyer/ProfileForm.tsx` and
  `components/auth/RegisterForm.tsx` (Rule 34.3). Three independent
  sections, each with its own submit/save path:
  1. **Profile Information** — full name (editable, forbidden-
     character filter per Rule 18.1), avatar upload (same
     click-avatar-to-upload pattern as the buyer form), read-only
     email/role badge/permissions list (empty-state text for
     super-admin "not permission-gated" vs. a regular admin with no
     permissions yet vs. a chip list).
  2. **Change Password** — current/new/confirm fields, a single
     show/hide toggle (mirrors `components/auth/RegisterForm.tsx`'s
     `authPasswordToggle` pattern, rebuilt under this page's own
     `adminProfile*` class names rather than importing `auth.css`),
     client-side strength pre-check mirroring the server's rule
     (8+ chars, uppercase, number, special character) — the server
     route re-validates regardless (Rule 18). Clears all three fields
     on success.
  3. **Notification Preferences** — three toggles
     (`newOrder`/`lowStock`/`weeklySummary`) built from a
     visually-hidden checkbox + custom switch track (keeps keyboard
     focus/`:focus-visible` working, never a div-only fake toggle).
     Each flip calls `saveNotificationPref` immediately and disables
     only that one switch while its save is in flight — never the
     whole section.
- `app/admin/profile/page.tsx` — new Server Component page (Rule
  31.1), same split as `app/buyer/profile/page.tsx` and
  `app/admin/security-logs/page.tsx`: no fetching of its own, just
  renders the client form component.
- `app/styles/adminProfile.css` — new stylesheet. Mirrors
  `app/styles/buyerProfile.css`'s token usage and class-naming
  convention (`adminProfile*` instead of `buyerProfile*`), extended
  with the admin-only pieces: a wrapper for three stacked section
  cards, a role badge, a permissions chip list, a password
  visibility-toggle button, and the notification switch styles.
- `app/admin/dashboard/page.tsx` — added a "My Profile" entry to
  `QUICK_ACTIONS`, `live: true`, linking to `/admin/profile` — the
  page would otherwise be unreachable from the UI.

## Verification

1. Log in as an admin → `/admin/dashboard` → click the new "My
   Profile" quick action → lands on `/admin/profile`.
2. **Profile Information:** change the full name and click "Save
   Profile" → toast "✓ Profile updated successfully." → refresh the
   page and confirm the new name persisted. Click the avatar circle,
   pick an image → toast "✓ Profile photo updated." and the new photo
   renders immediately.
3. **Role & permissions:** confirm the role badge shows "Admin" (or
   "Super Admin" if signed in as one) and the permissions section
   shows either your assigned permission chips, "No permissions
   assigned yet," or "Full access — not permission-gated" for a
   super-admin.
4. **Change Password:** enter an incorrect current password → submit
   → inline "Current password is incorrect." from the server, no
   crash. Enter a weak new password → inline client-side error before
   any request fires. Enter a correct current password and a valid
   new password (mismatched confirm first) → inline "New passwords do
   not match." Fix the confirm field and submit → toast "✓ Password
   updated successfully.", fields clear. Log out and back in with the
   new password to confirm it took effect.
5. **Notification Preferences:** flip each toggle on and off →
   each flip shows its own "✓ Preference saved." toast and the
   switch's visual state persists after a page refresh.
