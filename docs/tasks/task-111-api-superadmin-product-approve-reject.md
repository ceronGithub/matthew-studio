# task-111 — API: super-admin product approve/reject endpoints

**Fulfills spec:** Section 9.2 (Product approval flow — "Super-admin
approves or rejects from `/superAdmin/products`"),
`super_admin_account_specification.md`.
**taskPlan.md phase:** Phase 6 — Product & Order Management w/
approval flow (task-48+ tracker).
**Dependency:** task-109 (schema must accept `pending-review` first).

## What this builds
Two new super-admin-only routes, following the same
`getSessionAdmin` + `role === "superAdmin"` guard pattern already
used by the other `app/api/superadmin/*` routes (e.g. task-104's
backups list):

- `PATCH /api/superadmin/products/[productId]/approve` — flips
  `status` from `"pending-review"` to `"published"`. Rejects with 409
  if the product isn't currently `pending-review`.
- `PATCH /api/superadmin/products/[productId]/reject` — flips
  `status` from `"pending-review"` back to `"draft"`. Same 409 guard.

Both actions:
- Log to `SecurityLog` (Rule 38) or `AccountActivityLog` (Rule 42) —
  match whichever pattern the existing admin product write routes
  already use for audit trail, don't introduce a third logging path.
- Return the standard success/error JSON shape (Rule 28).

## Notes
- No email/toast-triggering side effects specified beyond the status
  flip itself — Section 9.2 doesn't call for notifying the admin who
  submitted it beyond the in-app notification bell, which is Phase
  8's scope (task-48+ tracker), not this task's.
- Reject does not delete the product — it returns to `draft` so the
  original admin can revise and resubmit.

## Verification
1. As a regular admin, create a product (task-110 → `pending-review`).
2. As a super-admin, call the approve endpoint for that product ID.
3. Expected: product's `status` becomes `"published"`, now visible on
   the storefront.
4. Create another `pending-review` product, call the reject endpoint.
5. Expected: product's `status` becomes `"draft"`, stays off the
   storefront, no error.
6. Call approve/reject on an already-`published` product.
7. Expected: 409 response, no status change.
