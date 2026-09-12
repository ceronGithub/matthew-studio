# task-95 — api-admin-management-actions

**Fulfills:** super_admin_account_specification.md Section 3.2.1 (row
actions) and Section 3.2.3 (Edit Fields + Actions)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5,
Phase 3 — Admin Management, part 3 of 6
**Dependency:** task-94 (list/detail) should land first so there's a
page to call these actions from, though the routes themselves don't
technically depend on it.

## Scope (not yet built — planning only)

- `PATCH /api/superadmin/admin-management/[adminId]` — edit full name
  + permissions (Section 3.2.3's Edit Fields).
- `POST /api/superadmin/admin-management/[adminId]/toggle-status` —
  deactivate/reactivate (Section 3.2.1's row action + 3.2.3's red
  "Deactivate Account" button) — confirmation modal (Rule 34.4) is a
  UI concern (task-96/98), this route just flips the status.
- `POST /api/superadmin/admin-management/[adminId]/reset-password` —
  sends a password-reset email (Section 3.2.3's separate "Reset
  Password" button).
- `DELETE /api/superadmin/admin-management/[adminId]` — permanent
  delete, superAdmin-only (already implied by the whole route group's
  gate, but double-check per Rule 6's ownership/authorization
  distinction — never rely on the route group gate alone for a
  destructive action). The 5-second confirmation delay from Section
  3.2.1 is a UI concern (Rule 34.4) — this route executes immediately
  once called; the delay lives in the button, not the API.
- Every action logs its own SecurityLog event (`admin_updated`,
  `admin_deactivated`/`admin_reactivated`, `admin_password_reset`,
  `admin_deleted`) — actor = calling super-admin, details naming the
  affected admin's email.
- Response shape per Rule 28.

## Explicitly out of scope

- List/detail (task-94) and create (task-93). This task is mutations
  on an existing admin only.
