# task-106 — API: add "delete" action to buyer actions route

**Fulfills spec:** Section 3.8 (super-admin buyer management —
list/deactivate/reactivate/reset/**delete**).
**taskPlan.md phase:** Phase 5 — Buyer Management.
**Dependency:** none (extends an already-shipped route).

## What this builds
Extends `app/api/admin/users/[buyerId]/actions/route.ts` — already
grouped by action discriminator (Rule "one grouped route over N
route files" precedent from task-30/77) — with a new
`case "delete":` branch:
- Permanently deletes the Supabase Auth user via
  `supabaseAdminClient.auth.admin.deleteUser(buyerId)`.
- Soft-deletes (never hard-deletes) any owned `Order` rows first by
  setting `deletedAt` (Rule 6's Soft Delete Standard) so order
  history/revenue reporting isn't silently corrupted by a vanished
  `userId` foreign key.
- Logs a `SecurityLog` `admin_action` event same as the other 5
  actions (already handled generically after the switch — no change
  needed there).
- Requires a `ConfirmationModal` (Rule 34.4) on the calling UI side
  (task-108) — this route itself doesn't gate on anything extra
  beyond the existing `getSessionAdmin()` check, same as its four
  siblings.

## Notes
- Not adding a second parallel `/api/superadmin/` route for this —
  the existing route is already admin+superAdmin accessible via
  `getSessionAdmin()`, and duplicating it would violate Rule 2's
  no-duplication principle for zero benefit.
- `getBuyerAuthUser()` already 404s on a non-buyer id — no additional
  role check needed for the new action.

## Verification
1. As super-admin, call `POST /api/admin/users/<buyerId>/actions`
   with `{ "action": "delete" }` for a disposable test buyer account
   (not one with real orders, until step 2 is confirmed working).
2. Expected: `200`, buyer no longer appears in Supabase Auth users
   list; any of their prior Orders remain in the DB with
   `deletedAt` set (not physically removed).
3. Confirm a `SecurityLog` row was written with
   `eventType: "admin_action"` and `details` mentioning `delete`.
4. Failure looks like: a 500, or the Auth user is deleted but Orders
   are left with a dangling `userId` and no `deletedAt` set (data
   integrity gap, not just a UI bug).
