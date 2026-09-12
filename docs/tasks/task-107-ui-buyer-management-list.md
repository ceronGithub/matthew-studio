# task-107 — UI: /superAdmin/buyer-management list page

**Fulfills spec:** Section 3.8 (super-admin's own buyer list —
distinct route from `/admin/users`, same underlying API).
**taskPlan.md phase:** Phase 5 — Buyer Management.
**Dependency:** none (reuses the already-live `GET /api/admin/users`).

## What this builds
`app/superAdmin/buyer-management/page.tsx` + a new
`components/buyer-management/BuyerManagementList.tsx` +
`app/styles/buyerManagement.css` — mirrors the structure of
`app/admin/users/page.tsx` / `components/admin/AdminUsersList.tsx`
(455 lines — the reason this is its own task rather than folded into
task-108) but under the super-admin route tree, fetching from the
same `GET /api/admin/users` endpoint (already admin+superAdmin
accessible). Same DataTable, filter toolbar, Rule 25
loading/empty/error states, and pagination pattern as every other
super-admin list page (Security Logs, Account Activity, Backups).

## Notes
- No new API route — this task is UI-only, consuming the existing
  list endpoint.
- Each row links to `/superAdmin/buyer-management/[buyerId]`
  (task-108) — not to `/admin/users/[buyerId]`, even though the
  underlying detail API is shared, so the super-admin stays inside
  their own route tree throughout.

## Verification
1. Sign in as super-admin, go to `/superAdmin/buyer-management`.
2. Expected: paginated buyer list loads, matching the same buyers
   `/admin/users` shows (same data source).
3. With zero buyers (fresh DB): empty state message, not a blank
   screen.
4. Clicking a row navigates to `/superAdmin/buyer-management/<id>`
   (404s gracefully until task-108 ships the detail page).
