# task-98 — ui-admin-management-edit

**Fulfills:** super_admin_account_specification.md Section 3.2.3
(Admin Details & Edit Page)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5,
Phase 3 — Admin Management, part 6 of 6 (final part)
**Dependency:** task-94 (detail API) and task-95 (actions API) must
both be [DONE] first.

## Scope (not yet built — planning only)

- New page `app/superAdmin/admin-management/[adminId]/edit/page.tsx`.
- Display section per Section 3.2.3: email, full name, role, created
  date + creator email, last login date/time + IP + city-level
  location, current status, permissions checklist.
- Edit fields: full name, permissions (checkbox group), status toggle.
- Actions: "Save Changes" (disabled during submission, Rule 34.3),
  "Cancel" (discard changes), "Reset Password" (separate button,
  ConfirmationModal), "Deactivate Account" (red button,
  ConfirmationModal).
- Toast on save per Rule 22.
- Loading/empty/error states per Rule 25 (e.g. adminId not found →
  Rule 31.10's `notFound()` pattern).

## Explicitly out of scope

- The list (task-96) and create (task-97) pages. This is the single-
  admin view/edit surface only.

## Phase completion note

Once this task closes, Phase 3 — Admin Management is fully done
(task-93 through task-98, all 6 parts). Per Rule 6, the parent
"Phase 3 — Admin Management" line in taskPlan.md should auto-flip to
[DONE] the same turn this task closes. NEXT-UP then moves to Phase 4
(remainder) — Backups, which still needs its own micro-task breakdown
(see docs/taskPlan.md's task-48+ section).
