# task-89 — Schema: PageViewDaily (anonymized traffic analytics)

**Fulfills:** sitewide_technical_seo_specification.md — traffic analytics
sub-item (Rule 41 in the operational protocol governs the actual shape
of this table; the spec doc itself only names the requirement).

**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING,
item 11 (sitewide_technical_seo_specification.md). This is the first of
3 micro-tasks task-53 was split into per Rule 49 Step 4 (touches DB
schema + API/beacon layer + super-admin UI — 3 distinct layers, over
the splitting threshold). Split: task-89 (schema, this file) → task-90
(beacon + write path) → task-91 (super-admin dashboard UI).

**Dependency:** None — first task in the split, no prior task required.

---

## What changed

Added `PageViewDaily` model to `prisma/schema.prisma`:
- One row per unique `(date, path, referrerHost, deviceType, countryCode)`
  combination — a pre-aggregated daily counter, never a per-visitor event
  row. This is the core Rule 41 constraint: no session ID, no visitor
  ID, no IP address stored anywhere in this table.
- `date` uses `@db.Date` (no time component) since aggregation is
  daily-bucketed.
- Indexed on `date` and `path` for the dashboard's common query
  patterns (time-series chart, top-pages list).

## Next micro-task (task-90)

`npx prisma db push && npx prisma generate` must be run before task-90,
since task-90's beacon route will call `prisma.pageViewDaily.upsert()`.
