# task-115 — UI: /superAdmin/content page (section tree + form)

**Fulfills spec:** Section 3.7.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-114 (content API must exist).

## What this builds
`app/superAdmin/content/page.tsx` (Server Component shell) +
`components/content/ContentEditor.tsx` (client) — same Server/Client
split as every other super-admin page in this app (Rule 31.1).

- Left panel: section tree grouped by area (Homepage, Shop, Standalone
  Pages, Site-wide) per Section 3.7's editable-sections list.
- Right panel: form fields generated from the selected section's
  `data` shape (a small per-`sectionKey` field-config map — not a
  fully generic JSON editor, so the UI stays readable per Rule 17).
- "Preview" button — `window.open()`s the live page in a new tab.
- "Publish" button — disabled during submission (Rule 34.3), calls
  task-114's PUT, toast on success (Rule 22).
- "Revert to last published" — lists the section's version history
  (up to 5), confirm via `ConfirmationModal` (Rule 34.4), calls the
  revert endpoint.
- Three required data states (Rule 25): loading skeleton, empty
  (no sections seeded yet), error with retry.

## Verification
1. Navigate to `/superAdmin/content`. Expected: section tree renders,
   selecting a section loads its form.
2. Edit a field, click Publish. Expected: toast fires, "Revert"
   history now shows a new entry.
3. Click Preview. Expected: opens the live page in a new tab.
4. Click Revert on the just-created version. Expected: confirmation
   modal names the section, confirming restores the prior data.
