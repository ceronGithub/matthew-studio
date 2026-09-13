# task-114 — API: content section CRUD (get, publish, revert)

**Fulfills spec:** Section 3.7, 9.3.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-113 (schema must exist first).

## What this builds
- `GET /api/superadmin/content` — list all `ContentSection` rows
  (id, sectionKey, label, updatedAt) for the section tree.
- `GET /api/superadmin/content/[sectionId]` — full row including
  current `data`, for the form panel.
- `PUT /api/superadmin/content/[sectionId]` — validates + saves new
  `data`; before overwriting, snapshots the *current* `data` into a
  new `ContentVersion` row, then deletes the oldest version(s) beyond
  5 for that section (Section 9.3). Logs `content_updated` to
  SecurityLog (Rule 38) with section name + which top-level fields
  changed (reuse `diffProductFields`-style diffing from
  `lib/auditLog.ts`, generalized for arbitrary JSON).
- `POST /api/superadmin/content/[sectionId]/revert` — takes a
  `versionId`, restores that snapshot's `data` onto the live
  `ContentSection` row (itself first snapshotted as a new version,
  so revert is never destructive).

All routes: `getSessionAdmin()` + `admin.role === "superAdmin"` only
(Section 3.7: "Regular admin has no CMS access unless explicitly
granted `manage-content`" — that permission gate is out of scope for
this task; ships super-admin-only first, per-admin grant is a
follow-up if the developer wants it).

## Verification
1. `GET /api/superadmin/content` as super-admin → 200, list of
   sections (empty array is fine before any are seeded).
2. `PUT` a section's data → 200, `ContentVersion` row created with
   the pre-update data.
3. Publish the same section 6 times → confirm only 5 `ContentVersion`
   rows remain for it afterward.
4. `POST .../revert` with an old versionId → live data matches that
   version's snapshot.
