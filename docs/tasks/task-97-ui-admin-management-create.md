# task-97 — ui-admin-management-create

**Fulfills:** super_admin_account_specification.md Section 3.2.2
(Create Admin Account)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5,
Phase 3 — Admin Management, part 5 of 6
**Dependency:** task-93 (create-admin API) must be [DONE] first.

## Scope (not yet built — planning only)

- New page `app/superAdmin/admin-management/create/page.tsx`.
- Form fields per Section 3.2.2: Full Name (text), Email (email),
  Permissions (checkbox group — the 6 known permission strings).
- React Hook Form + Zod per Rule 31.7/34.3: autofocus first field,
  inline validation, disabled submit while submitting, Enter submits.
- On success: toast (Rule 22) "✓ Admin account created. Credentials
  sent to [email]." + redirect to `/superAdmin/admin-management/
  [newAdminId]` (task-98's page).
- On email-uniqueness conflict (409 from task-93's API): inline field
  error on the Email input, never a generic top-of-form banner.

## Explicitly out of scope

- The list page (task-96) and the edit/detail page (task-98).
