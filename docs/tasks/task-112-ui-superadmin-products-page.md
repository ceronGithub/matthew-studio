# task-112 — UI: /superAdmin/products page with Pending Review filter

**Fulfills spec:** Section 9.2 ("Super-admin approves or rejects from
`/superAdmin/products` (filter: Pending Review)"),
`super_admin_account_specification.md`.
**taskPlan.md phase:** Phase 6 — Product & Order Management w/
approval flow (task-48+ tracker).
**Dependency:** task-110 (products must be able to reach
`pending-review`), task-111 (approve/reject endpoints must exist).

## What this builds
`app/superAdmin/products/page.tsx` — a DataTable listing all
products, with a status filter defaulting to "Pending Review" per
the spec's own filter callout. Same Server/Client split and
loading/empty/error pattern (Rule 25) as the other super-admin list
pages (security-logs, account-activity, backups).

- Row actions: **Approve** and **Reject** buttons on any
  `pending-review` row, calling task-111's two endpoints.
- Reject goes through the shared `ConfirmationModal` (Rule 34.4) —
  names the product by title, confirm label "Reject".
- Approve does not need a confirmation modal — matches the existing
  precedent elsewhere in this app of non-destructive status changes
  toasting without a modal gate (see task-108's Notes for the same
  reasoning applied to Deactivate/Reactivate).
- Toast on both actions (Rule 22): `✓ Product "X" approved and now
  live.` / `✓ Product "X" has been rejected.`
- Add a "Products" entry to the super-admin dashboard's
  `QUICK_ACTIONS` list, same precedent as task-105/task-108.

## Notes
- This is the super-admin's own products view — distinct from the
  regular admin's existing products list (task-22,
  `/admin/products`), same relationship as buyer-management (task-107)
  is to `/admin/users`. Do not merge the two routes.

## Verification
1. Navigate to `/superAdmin/products`.
2. Expected: filter defaults to "Pending Review", shows any products
   currently in that state.
3. Click Approve on a row.
4. Expected: toast fires, product disappears from the Pending Review
   filter, now live on the storefront.
5. Click Reject on a row → confirmation modal names the product →
   Confirm.
6. Expected: toast fires, product disappears from Pending Review,
   status is `draft`.
7. Dashboard: "Products" quick action card links correctly to this
   page.
