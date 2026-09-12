# task-110 — API: admin product create/edit saves as pending-review

**Fulfills spec:** Section 9.2 (Product approval flow) +
Section 3.10 Product Management, `super_admin_account_specification.md`.
**taskPlan.md phase:** Phase 6 — Product & Order Management w/
approval flow (task-48+ tracker).
**Dependency:** task-109 (schema must accept `pending-review` first).

## What this builds
Extends the existing regular-admin product create/write routes
(task-21, `admin_account_specification.md` Section 3.10) so that:

- A product created by a regular `admin`-role account is saved with
  `status: "pending-review"` instead of `"published"`.
- A product *edited* by a regular admin also reverts to
  `status: "pending-review"` on save (per Section 9.2 — "nothing goes
  live without super-admin's implicit or explicit sign-off" applies
  to edits, not just creation).
- A product created or edited by a `superAdmin`-role account bypasses
  this and saves directly as `"published"` — super-admins don't need
  their own approval.
- Storefront-facing product queries (shop listing, product detail)
  must exclude `pending-review` products — same pattern as the
  existing `deletedAt` soft-delete exclusion (Rule 6).

## Notes
- Locate the role check via the existing `getAdminAuthUser`/session
  pattern already used elsewhere in the admin routes — reuse it,
  don't add a new one.
- Do not touch the super-admin approve/reject logic here — that's
  task-111's scope, kept separate per Rule 49 Step 4.

## Verification
1. Log in as a regular admin, create a new product.
2. Expected: product saves with `status: "pending-review"`, and does
   NOT appear on the public storefront/shop page.
3. Log in as a super-admin, create a new product.
4. Expected: product saves with `status: "published"` immediately.
5. As a regular admin, edit an already-published product's price.
6. Expected: after save, that product's status flips back to
   `pending-review` and disappears from the storefront until
   re-approved.
