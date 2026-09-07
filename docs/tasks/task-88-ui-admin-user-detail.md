# task-88 — Buyer Detail Page UI (Users Management, detail half)

**Spec section:** admin_account_specification.md Section 3.4.2 (Buyer Details page)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-73 split
**Depends on:** task-85 (GET /api/admin/users/[buyerId]), task-86 (POST /api/admin/users/[buyerId]/actions) — both DONE
**Status:** DONE — built 2026-09-08

## What was built
- `app/admin/users/[buyerId]/page.tsx` — Server Component shell (Rule 31.1),
  same split as `app/admin/orders/[orderId]/page.tsx`.
- `components/admin/AdminUserDetail.tsx` — client detail view: account info
  card, last-login card (city-level location + IP from SecurityLog via
  task-85), recent-orders list linking to `/admin/orders/[orderId]`,
  account-activity trail, internal notes list + add-note form, and the
  account-access actions (deactivate/reactivate, reset password) behind
  `ConfirmationModal` (Rule 34.4), plus a direct-submit email-buyer form
  (Rule 34.3). Handles all three required data states (Rule 25) plus a
  dedicated "not found" state, mirroring `AdminOrderDetail.tsx`'s pattern.
- `lib/hooks/useAdminUserDetail.ts` — fetch/notFound/error state (Rule 25),
  plus `setActive`/`resetPassword`/`sendBuyerEmail`/`addNote` wrapping
  task-86's grouped actions endpoint. `setActive`/`addNote` merge the
  action's own response into local state rather than refetching the whole
  buyer, same precedent as `useAdminOrderDetail.ts`.
- `app/styles/adminUserDetail.css` — mirrors `adminOrderDetail.css`'s
  card/list/action/skeleton patterns, plus its own copy of the shared
  `.confirmationModal*` classes (same per-page-duplication precedent).

## Row & action wiring (Section 3.4.2)
- **Deactivate/Reactivate** → `ConfirmationModal`, then task-86's
  `deactivate`/`reactivate` action.
- **Reset Password** → `ConfirmationModal`, then task-86's
  `reset_password` action. Disabled when the buyer has no email on file
  (task-86's own guard for that case).
- **Send Email** → subject + message form (Rule 34.3: submit disabled
  while sending or until both fields are filled), then task-86's
  `send_email` action.
- **Add Note** → direct submit to task-86's `add_note` action, appended
  to the internal notes list.

## Scope notes
- Account Activity section will render its empty state for now —
  `recordAccountActivity()` isn't wired into any buyer-facing layout yet
  (task-85's own flagged gap). The UI's three-state pattern is already in
  place so no further UI change is needed once that instrumentation lands.
- Recent orders link out to the existing `/admin/orders/[orderId]` detail
  page (task-81) rather than duplicating any order data here.
- `npx tsc --noEmit` could not be run in this environment — `node_modules`
  isn't installed here (same constraint noted in task-84/85/86/87's docs).
  Run `npm install && npx prisma generate && npx tsc --noEmit` locally
  before merging to confirm a clean baseline; no Prisma schema changes
  were made by this task so no new migration is required.
- No new env vars, no schema changes — this is a UI-only task consuming
  task-85/86's existing endpoints as-is.

## Reconciliation note (Rule 49.1)
Found and corrected during this task's Step -1 audit: `docs/taskPlan.md`
still showed `task-87` as `[ ]` (not started) even though `task-87`'s own
file already said `Status: DONE — built 2026-09-08`, and Layer-3
verification confirmed `app/admin/users/page.tsx`,
`components/admin/AdminUsersList.tsx`, `lib/hooks/useAdminUsers.ts`, and
`app/styles/adminUsers.css` all exist and are wired. This was a stale
status line, not a numbering gap or missing file — corrected in
`docs/taskPlan.md` and `overviewProject.txt` Section 5C in the same turn
as this task, per Rule 16.1.
