# task-80 — Admin Orders List Page (UI)

**Spec section:** admin_account_specification.md Section 3.3.1 (Order List Page)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C)
**Depends on:** task-74 (Order list API), task-77 (per-order actions API)
**Status:** DONE — built 2026-09-07

## What was built
- `lib/hooks/useAdminOrders.ts` — list fetch, status/date-range/search
  filters, pagination, row selection, CSV export, bulk status update.
- `components/admin/AdminOrdersList.tsx` — table UI with filter bar,
  bulk action bar (behind a ConfirmationModal), CSV export button,
  status badges (reuses `lib/orderStatus.ts`), row "View" link to
  `/admin/orders/[orderId]` (task-81, not yet built).
- `app/admin/orders/page.tsx` — Server Component page shell.
- `app/styles/adminOrders.css` — table/toolbar/bulk-bar styles, design
  tokens only, no hardcoded colors/spacing.

## Scope notes
- Bulk status update calls the existing single-order
  `POST /api/admin/orders/[orderId]/actions` endpoint once per
  selected order (parallelized) rather than adding a new bulk API
  route — this task is UI-only per Rule 49 Step 4's layer-count
  threshold; a dedicated bulk endpoint is a separate future task if
  the fan-out pattern becomes a performance concern at scale.
- The "View" link points to `/admin/orders/[orderId]`, which does not
  exist yet (task-81) — intentional, so this page ships ready for it.
