# Task 71 — Admin Dashboard

- **Fulfills:** `admin_account_specification.md` Section 3.1 (Dashboard Home)
- **Task Plan phase:** PHASE 3 (remainder) — Admin & Super-Admin Oversight,
  item 4 (`admin_account_specification.md`)
- **Dependency:** none blocking — Order/Product models and
  `supabaseAdminClient` auth lookup (used by the admin support tickets
  route) already existed and were reused as-is.

## Status: DONE (2026-09-07)

## What was built
- `lib/adminDashboardStats.ts` — `getAdminQuickStats()`,
  `getRecentOrders()`, `getRecentProducts()`, `getAdminDashboardAlerts()`.
  All four fail soft (return zeros/empty arrays on error) so a stats
  outage never denies dashboard access.
- `app/admin/dashboard/page.tsx` — full rewrite, replacing the
  "coming soon" placeholder. Server Component, direct data fetching
  (Rule 31.1/31.2), no API route.
- `app/styles/adminDashboard.css` — page-specific styles, tokens-only.

## Spec deviations (documented, not silent)
- Spec §3.1 #4 lists a low-inventory alert and an expiring-promotions
  alert. Neither `Product` nor any other model in this schema has an
  inventory/stock field or a promotions table, so both alerts are
  **structurally skipped** rather than faked with placeholder data.
  Only "pending orders needing action" is wired.
- Customer identity in Recent Orders comes from Supabase Auth
  (`supabaseAdminClient.auth.admin.getUserById`), batched by unique
  `userId` the same way `app/api/admin/support/tickets/route.ts`
  already does it, since this repo has no local User table. Guest
  orders fall back to `Order.guestEmail`, then `"Guest"`.
- "Manage Orders" and "Manage Users" / "View Analytics" quick-action
  cards point at what exists today (Product management) or are
  visually greyed out with `live: false` where the target page
  doesn't exist yet (task-72/task-73/task-65 respectively) — never a
  link to a page that 404s.

## Verification note
`npx prisma generate` could not be run in the build sandbox (network
egress to `binaries.prisma.sh` is blocked there), so `npx tsc --noEmit`
could not be fully confirmed end-to-end. The errors that did surface
were the same "implicit any / no exported member" pattern already
present in unrelated sibling files that also depend on the generated
Prisma client (`app/api/buyer/orders/route.ts`,
`app/api/admin/support/tickets/route.ts`, etc.) — not new errors from
this task. **Run `npx prisma generate && npx tsc --noEmit` locally
before merging.**
