# task-96 — ui-admin-management-list

**Fulfills:** super_admin_account_specification.md Section 3.2.1
(Admin List Page)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5,
Phase 3 — Admin Management, part 4 of 6
**Dependency:** task-94 (list API) must be [DONE] first; task-95
(actions API) must be [DONE] first for the row-action buttons to work.

## Scope (not yet built — planning only)

- New page `app/superAdmin/admin-management/page.tsx` — Server
  Component shell + client DataTable, same split pattern as
  `app/superAdmin/security-logs/page.tsx`.
- Columns per Section 3.2.1: Email, Name, Created Date, Last Login,
  Status (🟢/🟡/🔴 per the spec's indicators), Actions.
- Filters: Status, Created Date Range, Search (email/name).
- Export CSV button, calling task-94's `?format=csv` variant.
- Row actions: View Details (link), Edit (link), Deactivate/Reactivate
  (ConfirmationModal, Rule 34.4), Reset Password (ConfirmationModal),
  Delete (ConfirmationModal with 5-second delay per Section 3.2.1 —
  reuse/extend the shared `ConfirmationModal` component; check
  whether it already supports a delay variant before building a new
  one).
- Loading/empty/error states per Rule 25.
- Toasts per Rule 22 on every action (deactivate/reactivate/reset-
  password/delete).
- "Create Admin" button linking to task-97's page.

## Explicitly out of scope

- Create and edit pages (task-97/98).
