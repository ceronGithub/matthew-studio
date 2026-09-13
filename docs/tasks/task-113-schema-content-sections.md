# task-113 — schema: ContentSection + ContentVersion models

**Fulfills spec:** Section 3.7 (Content Management/CMS), 9.3
(version history beyond 1 revert), `super_admin_account_specification.md`.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** None.

## What this builds
Adds two models to `prisma/schema.prisma`:

- `ContentSection` — one row per editable section (`sectionKey` e.g.
  `"homepage.hero"`, `"shop.pricing"`, `"footer"`; `label` for the
  section-tree UI; `data` as `Json` since each section's shape
  differs, matching the existing `lib/*Data.ts` static structures
  per Section 3.7).
- `ContentVersion` — one row per prior snapshot of a section's `data`,
  keeps the last 5 per section (Section 9.3 raises the "1 prior
  version" default). Pruning of the 6th-oldest happens in task-114's
  publish logic, not in the schema itself.

## Verification
1. Run `npx prisma db push` then `npx prisma generate`.
2. Confirm both models appear in the generated Prisma Client types.
