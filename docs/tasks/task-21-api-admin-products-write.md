# Task 21 — Admin product create/update/delete routes

**Fulfills:** admin_account_specification.md Section 3.2 (Product CRUD)
**Phase:** PHASE 3 — ADMIN & SUPER-ADMIN OVERSIGHT
**Dependency:** task-20 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

New `lib/adminProductValidation.ts` (CATEGORY_LABELS, VALID_CATEGORIES/
STATUSES, FORBIDDEN_CHARACTERS per Rule 18.1, `validateProductInput()`,
`slugify()`) and `lib/auditLog.ts` (`recordAuditLog()` +
`diffProductFields()`). `POST /api/admin/products` (CSRF → auth →
permission → validate → slug collision retry via P2002 → create →
AuditLog "created"). `PUT`/`DELETE /api/admin/products/[productId]`
(PUT diffs + AuditLog "updated"; DELETE is a soft delete only, never
hard `.delete()`, AuditLog "deleted"). Media fields left to
product_media_upload_specification.md (task-24+).
