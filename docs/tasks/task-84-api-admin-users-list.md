# task-84 — Buyer List API (Users Management, list half)

**Spec section:** admin_account_specification.md Section 3.4.1 (Buyer List Page)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-73 split
**Depends on:** task-83 (BuyerAdminMeta schema, though this route doesn't use it — see Scope notes)
**Status:** DONE — built 2026-09-07

## What was built
- `app/api/admin/users/route.ts` — `GET`, admin/super-admin only via
  `getSessionAdmin()`. Primary data source is Supabase Admin API
  (`listUsers`), not Prisma — there is no local Buyer/User table.
  Pages through `listUsers` (up to 10,000 users), keeps only
  `role: "buyer"` accounts (admins/super-admins are Supabase Auth
  users too, differentiated by `user_metadata.role`), then applies
  status/date-range/search filters and sorting in memory, since
  Supabase's Admin API has no server-side full-text filter — same
  "list and match" precedent already established in
  `lib/getUserByEmail.ts`.
- Per-page Order aggregates (count + lifetime value) resolved via one
  `prisma.order.groupBy` call; last login resolved via one
  `SecurityLog` query (most recent `login_success` row per email) —
  both batched across the current page's buyers, never per-row
  queries in a loop.
- Status (Active/Inactive) is derived from Supabase's own
  `banned_until` field rather than a new local flag — consistent with
  task-83's decision not to duplicate that as schema.
- CSV export at `?format=csv`, capped at 5000 rows, same pattern as
  task-75's orders CSV export.

## Scope notes
- Dropped the "note presence" column mentioned when the task-73 split
  was first planned in task-83's traceability file — the spec's actual
  column list (Section 3.4.1: Email, Name, Account Created, Last
  Login, Status, Total Orders, Lifetime Value, Actions) doesn't
  include it, so it was left out per Rule 2 rather than adding an
  unrequested feature. `BuyerAdminMeta` (task-83) is used starting
  task-85 (detail page) and task-86 (add-note action) instead.
- `npx tsc --noEmit` shows 3 new errors, all the same "Prisma client
  not generated" class as every prior task-8x entry
  (`groupBy`'s `_count`/`_sum` come back untyped as `{}` without a
  generated client). Run `npx prisma generate && npx tsc --noEmit` in
  a real dev environment to confirm a clean baseline before merging.
- Fetching up to 10,000 Supabase Auth users per request and filtering
  in memory is acceptable at this project's current scale (a template
  shop, not a high-volume marketplace) but would need a real
  server-side filter (or a local buyer-index table kept in sync via
  webhook) if the buyer base grows large enough for this to matter —
  flagged in the route's own header comment for whoever picks that up
  later.
