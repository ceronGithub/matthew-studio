# Task 74 — Order Management Schema (statusHistory / notes / refund)

- **Fulfills:** `admin_account_specification.md` Section 3.3.2 (Timeline,
  Add Note, Issue Refund) — the data-layer piece of the Section 3.3
  Order Management feature.
- **Task Plan phase:** PHASE 3 (remainder) — Admin & Super-Admin
  Oversight, item 4, task-72's split (first of task-74 through task-82).
- **Dependency:** none blocking — extends the existing `Order` model,
  no other task needs to land first.

## Status: DONE (2026-09-07)

## What was built
Added four fields to `Order` in `prisma/schema.prisma`:
- `statusHistory Json?` — array of `{status, adminId, note, createdAt}`.
  Feeds Section 3.3.2 #5's Timeline (Created/Confirmed/Shipped/Delivered
  dates) without a dedicated DateTime column per status — mirrors the
  existing `productionStageHistory` pattern already used for t-shirt
  tracking, so the same JSON-array-of-events convention applies to
  both timelines instead of introducing a second pattern.
- `internalNotes Json?` — array of `{note, adminId, createdAt}`,
  admin-only, never surfaced to the buyer.
- `refundReason String?` / `refundedAt DateTime?` — set together by
  task-77's refund route.

All four are nullable and additive — no migration risk to existing
rows, no backfill needed.

## Next step
Run `npx prisma db push && npx prisma generate` before starting
task-75 (order list API), since task-75/76/77 all read/write these
new fields.

## Verification note
Could not run `npx prisma validate` in the build sandbox (network
egress to `binaries.prisma.sh` is blocked there) — reviewed the diff
manually for balanced braces/valid types. **Run `npx prisma db push
&& npx prisma generate` locally to confirm the schema applies
cleanly before building task-75.**
