# Task 23 — Admin product create/edit form UI

**Fulfills:** admin_account_specification.md Section 3.2 (Product CRUD)
**Phase:** PHASE 3 — ADMIN & SUPER-ADMIN OVERSIGHT
**Dependency:** task-22 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

New `lib/hooks/useAdminProductForm.ts` (single hook for create and
edit modes, manual validate()-mirrors-server pattern) and
`components/admin/AdminProductForm.tsx` (name/category/description
with char counter/price/status radios/tags/featured checkbox,
autofocus, inline field errors, disabled submit while saving). Closes
Product CRUD end to end — all of task-19 through task-23 now done.
