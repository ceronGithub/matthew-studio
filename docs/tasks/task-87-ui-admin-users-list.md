# task-87 — Buyer List Page UI (Users Management, list half)

**Spec section:** admin_account_specification.md Section 3.4.1 (Buyer List Page)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-73 split
**Depends on:** task-84 (GET /api/admin/users), task-86 (POST /api/admin/users/[buyerId]/actions)
**Status:** DONE — built 2026-09-08

## What was built
- `app/admin/users/page.tsx` — Server Component shell (Rule 31.1), same
  split as `app/admin/orders/page.tsx` and `app/admin/products/page.tsx`.
- `components/admin/AdminUsersList.tsx` — client list: status/date-range/
  search filters, checkbox row selection with a bulk deactivate/reactivate
  bar, CSV export button, paginated table (Email, Name, Account Created,
  Last Login, Status, Total Orders, Lifetime Value, Actions), and the
  three required data states (Rule 25: loading skeleton, empty state,
  error state with retry). Mirrors `components/admin/AdminOrdersList.tsx`'s
  structure and its use of the shared `ConfirmationModal` (Rule 34.4).
- `lib/hooks/useAdminUsers.ts` — fetch/filters/pagination/selection/CSV
  export, plus single-row and bulk `setActive`/`bulkSetActive` (fans out
  to task-86's per-buyer actions endpoint in parallel, same precedent as
  `useAdminOrders.ts`'s `bulkUpdateStatus`), and single-row
  `resetPassword`/`sendEmail` wrappers around the same endpoint.
- `app/styles/adminUsers.css` — mirrors `adminOrders.css`'s table/toolbar/
  bulk-bar/pagination patterns, plus its own copy of the shared
  `.confirmationModal*` classes (same per-page-duplication precedent as
  `adminOrderDetail.css`), and a small compose-email modal built on the
  same dialog shell for the "Send Email" row action.

## Row & bulk actions (Section 3.4.1)
- **View Details** → links to `/admin/users/[buyerId]` (task-88 — route
  exists here so this page ships ready for it, even before that page is
  built, same precedent as `AdminOrdersList`'s link to task-81).
- **Deactivate/Reactivate** → confirmation modal, then task-86's
  `deactivate`/`reactivate` action.
- **Reset Password** → confirmation modal, then task-86's
  `reset_password` action.
- **Send Email** → dedicated compose modal (subject + message, Rule 34.3
  form UX: autofocus, submit disabled while sending and until both
  fields are filled), then task-86's `send_email` action. Built as a
  one-off modal rather than reusing `ConfirmationModal` since the spec
  calls for a form, not a yes/no confirmation — shares that component's
  CSS shell (`.confirmationModal*`) instead of introducing a second
  visual style.
- **Bulk deactivate/reactivate** — two explicit buttons (not a select,
  since there are only two possible bulk states) rather than mirroring
  `AdminOrdersList`'s multi-value status dropdown; each opens the shared
  `ConfirmationModal` before fanning out.

## Scope notes
- Bulk actions dropped the spec's "Export selected to CSV" bullet
  (Section 3.4.1's "RECOMMENDED ENHANCEMENT" list) — the existing CSV
  export already covers the current filtered set, and task-84's list API
  has no selected-IDs export path; adding one would be a new API
  micro-task, not a UI-only change, so it's left for a follow-up rather
  than silently scoped into this ticket.
- `npx tsc --noEmit` could not be run in this environment — `node_modules`
  isn't installed here (same constraint noted in task-84/85/86's docs, one
  level further back since even a plain `npm install` wasn't run). Run
  `npm install && npx prisma generate && npx tsc --noEmit` locally before
  merging to confirm a clean baseline; no Prisma schema changes were made
  by this task so no new migration is required.
- No new env vars, no schema changes — this is a UI-only task consuming
  task-84/86's existing endpoints as-is.
