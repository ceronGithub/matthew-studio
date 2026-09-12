# task-94 — api-admin-management-list-detail

**Fulfills:** super_admin_account_specification.md Section 3.2.1
(Admin List Page) and Section 3.2.3 (Admin Details & Edit Page, read
half)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5,
Phase 3 — Admin Management, part 2 of 6
**Dependency:** task-93 (create-admin) not required as a hard
blocker, but should land first so there's data to list against.

## Scope (not yet built — planning only)

- `GET /api/superadmin/admin-management` — paginated (25/page, newest
  first), filterable by status (active/inactive/locked) and created-
  date range, searchable by email/name. Reads from Supabase's admin
  user list (`auth.admin.listUsers`), filtered to `role: "admin"` —
  not a Prisma table, since admin accounts are Supabase Auth users
  with metadata, same pattern as `lib/getSessionAdmin.ts`.
- `GET /api/superadmin/admin-management/[adminId]` — single admin
  detail: email, full name, role, created date + creator email, last
  login date/time + IP + city-level location (join against
  `SecurityLog` for the most recent `login_success` row, same pattern
  as `lib/securityLogsQuery.ts`), current status, permissions.
- CSV export variant of the list endpoint (`?format=csv`), per Section
  3.2.1's "Export: CSV with all admin data".
- Response shape per Rule 28.

## Explicitly out of scope

- Any mutation (create, edit, deactivate, reset-password, delete) —
  those are task-93 (create) and task-95 (actions). This task is
  read-only.
