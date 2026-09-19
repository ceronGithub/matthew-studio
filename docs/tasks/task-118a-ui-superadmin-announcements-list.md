# task-118a — UI: Announcements list page + pagination

**Fulfills spec:** Section 3.9 (list view).
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-117 (announcements API must exist).
**Split from:** task-118 (1 of 4 micro-tasks — see task-118b/c/d).
**NEEDS:** task-117
**SETUP:** none — task-117's schema+API already exist, this is UI-only
**FILES TO TOUCH:** app/superAdmin/announcements/page.tsx (new,
  Server Component), components/announcements/AnnouncementsList.tsx
  (new, Client Component)
**DONE WHEN:** page loads at /superAdmin/announcements showing a
  paginated list (Title, Status badge, Publish Date, Expiry Date,
  Placement, Actions column present but unwired); loading/empty/error
  states render per Rule 25; matches the Server/Client split pattern
  used by /superAdmin/products

## What this builds
Read-only list surface only — no create/edit/duplicate/delete logic
yet (that's task-118b/c). Actions column can render disabled/stub
buttons.
