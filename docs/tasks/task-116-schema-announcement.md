# task-116 — schema: Announcement model

**Fulfills spec:** Section 3.9 (Announcements).
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** None.
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** prisma/schema.prisma (add `Announcement` model)
**DONE WHEN:** (1) `Announcement` model exists in schema.prisma with title, message, placement, status, publishAt, expiresAt, createdBy/updatedBy, timestamps, deletedAt; (2) `npx prisma db push` runs clean; (3) `npx prisma generate` runs clean; (4) `Announcement` type appears in generated Prisma Client.

## What this builds
Adds `Announcement` to `prisma/schema.prisma`:
`title`, `message`, `placement` (`"homepage-banner"` |
`"shop-banner"` | `"login-toast"`), `status` (`"draft"` |
`"scheduled"` | `"live"` | `"expired"`, default `"draft"`),
`publishAt` (DateTime, required), `expiresAt` (DateTime?, optional —
blank means manual-dismiss-only per spec), `createdBy`/`updatedBy`,
timestamps, `deletedAt` (Rule 6 soft delete).

## Verification
1. `npx prisma db push` then `npx prisma generate`.
2. Confirm `Announcement` appears in the generated Prisma Client types.
