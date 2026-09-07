# Task 22 — Admin product list UI

**Fulfills:** admin_account_specification.md Section 3.2 (Product CRUD)
**Phase:** PHASE 3 — ADMIN & SUPER-ADMIN OVERSIGHT
**Dependency:** task-21 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

New `lib/hooks/useAdminProducts.ts` (loading/empty/error + pagination,
category/status/search filters, debounced search, `deleteProduct()`)
and `components/admin/AdminProductsList.tsx` (toolbar, row list, Edit
link, Delete behind `ConfirmationModal` + toast). New
`app/admin/products/page.tsx` + `app/styles/adminProducts.css`
(mirrors `adminSupport.css` conventions). "Product management" moved
from planned to live on the admin dashboard. Bulk actions/CSV export
deferred.
