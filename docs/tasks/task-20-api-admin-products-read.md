# Task 20 — Admin product read routes

**Fulfills:** admin_account_specification.md Section 3.2 (Product CRUD)
**Phase:** PHASE 3 — ADMIN & SUPER-ADMIN OVERSIGHT
**Dependency:** task-19 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

New `lib/hasAdminPermission.ts` ("manage-products" permission check —
super-admin always passes, regular admin checked against
`user_metadata.permissions`). `GET /api/admin/products` (paginated
25/page, category/status/search filters, `deletedAt: null` always per
Rule 6) and `GET /api/admin/products/[productId]` (full detail incl.
galleryImages, 404 on deleted/missing). No mutations (task-21), no UI
(task-22/23).
