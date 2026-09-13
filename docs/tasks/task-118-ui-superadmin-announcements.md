# task-118 — UI: /superAdmin/announcements page

**Fulfills spec:** Section 3.9.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-117 (announcements API must exist).

## What this builds
`app/superAdmin/announcements/page.tsx` +
`components/announcements/AnnouncementsList.tsx` (client), same
Server/Client split and loading/empty/error pattern (Rule 25) as
`/superAdmin/products`.

- List: Title, Status badge, Publish Date, Expiry Date, Placement,
  Actions — paginated.
- "Create Announcement" button → form (Title, Message w/ character
  counter per Rule 34.3, Placement dropdown, Publish-at datetime,
  Expires-at datetime optional, Status toggle).
- Row actions: Edit, Duplicate, Deactivate early, Delete (through
  `ConfirmationModal`, Rule 34.4, 5-second delay per Section 3.8's
  precedent).
- Toasts (Rule 22) on every action per the standard trigger list.
- Add an "Announcements" `QUICK_ACTIONS` card to the super-admin
  dashboard, same precedent as task-105/108/112.

## Verification
1. Navigate to `/superAdmin/announcements`, click "Create
   Announcement". Fill the form, save. Expected: toast, new row in
   list with correct status.
2. Click Duplicate on that row. Expected: new row appears, title has
   " (Copy)", status "Draft".
3. Click Delete → confirmation modal names the announcement → confirm
   → 5-second delay → row removed.
4. Dashboard: "Announcements" quick action card links correctly.
