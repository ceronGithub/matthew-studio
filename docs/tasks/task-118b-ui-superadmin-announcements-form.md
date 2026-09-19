# task-118b — UI: Create/Edit Announcement form

**Fulfills spec:** Section 3.9 (create/edit).
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-118a (list page must exist to hold the trigger
  button and Edit action).
**Split from:** task-118 (2 of 4 micro-tasks).
**NEEDS:** task-118a
**SETUP:** none
**FILES TO TOUCH:** components/announcements/AnnouncementForm.tsx
  (new), components/announcements/AnnouncementsList.tsx (edit — wire
  "Create Announcement" button + Edit row action to open this form)
**DONE WHEN:** "Create Announcement" opens the form; saving creates a
  new row with a toast and correct status; Edit action opens the same
  form pre-filled and saves updates with a toast

## What this builds
Form fields: Title, Message (with character counter per Rule 34.3),
Placement dropdown, Publish-at datetime, Expires-at datetime
(optional), Status toggle. Frontend + backend validation per existing
protocol form standards (React Hook Form + Zod, Rule 31.7/34.3).
