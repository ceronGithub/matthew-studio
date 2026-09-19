# task-118c — Row actions: Duplicate, Deactivate early, Delete

**Fulfills spec:** Section 3.9 (row actions).
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-118a (list page must exist to hold the row
  actions).
**Split from:** task-118 (3 of 4 micro-tasks).
**NEEDS:** task-118a
**SETUP:** none
**FILES TO TOUCH:** components/announcements/AnnouncementsList.tsx
  (edit — add Duplicate/Deactivate/Delete handlers), shared
  ConfirmationModal component (existing, Rule 34.4 — reused, not
  modified)
**DONE WHEN:** Duplicate creates a new row titled "(Copy)" with status
  "Draft" + toast; Deactivate early updates status + toast; Delete
  opens ConfirmationModal naming the specific announcement, waits the
  5-second delay (Section 3.8 precedent), then removes the row + toast

## What this builds
No new form/page — wiring three action handlers onto the list built
in task-118a, each with a toast per Rule 22's standard trigger list.
