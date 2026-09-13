# task-117 — API: announcement CRUD

**Fulfills spec:** Section 3.9.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-116 (schema must exist first).

## What this builds
`app/api/superadmin/announcements/route.ts`:
- `GET` — paginated list (mirrors `app/api/superadmin/products/route.ts`'s
  pattern: page/limit/status/search params, excludes soft-deleted).
- `POST` — create. Validates title/message/placement/publishAt per
  Section 3.9's required fields; status defaults to what the form
  sends (Draft/Scheduled/Live).

`app/api/superadmin/announcements/[announcementId]/route.ts`:
- `PUT` — edit.
- `DELETE` — soft delete (Rule 6), with the 5-second-delay pattern
  already used for admin/buyer delete (Section 3.8's note) — confirm
  the existing delay implementation and reuse it, don't reinvent.

`app/api/superadmin/announcements/[announcementId]/duplicate/route.ts`:
- `POST` — clones the row (new id, status forced back to `"draft"`,
  title suffixed `" (Copy)"`).

`app/api/superadmin/announcements/[announcementId]/deactivate/route.ts`:
- `PATCH` — sets `status: "expired"` early (manual deactivation ahead
  of `expiresAt`).

All routes: super-admin only, CSRF-checked on mutating verbs, log
`announcement_published` / `announcement_deactivated` to SecurityLog
(Rule 38) with title + placement.

## Verification
1. `POST` a new announcement with `status: "draft"` → 201/200, row
   created.
2. `PATCH .../deactivate` on a live one → status becomes `"expired"`,
   SecurityLog row written.
3. `POST .../duplicate` → new row exists, status `"draft"`, title has
   " (Copy)" suffix.
4. `DELETE` → row's `deletedAt` set, no longer appears in GET list.
