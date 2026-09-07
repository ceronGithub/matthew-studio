# Task 92 — Admin Analytics API (reconciled from existing code — verify against Layer-3 audit)

**Spec Reference:** admin_account_specification.md Section 3.5 (Analytics Dashboard)
**Task Plan Phase:** PHASE 3 (remainder) — ADMIN & SUPER-ADMIN OVERSIGHT (item 4, admin_account_specification.md)
**Dependency:** task-89/90/91 (PageViewDaily table + traffic beacon + super-admin dashboard, item 11) [DONE] — item 4's Analytics slice was blocked on this table existing
**Status:** DONE (commit "done task 92")

---

## Reconciliation note (Rule 49.1)

This file did not exist prior to 2026-09-08. `app/api/admin/analytics/route.ts`
and `lib/adminAnalyticsStats.ts` were already built and committed
("done task 92"), and `docs/taskPlan.md` still showed the parent
`task-65 — Analytics` line as `[ ]` with no mention of a split. The
route's own header comment identifies itself as "task-92, split from
task-65 per Rule 49 Step 4 — this is the API half, app/admin/analytics/
page.tsx (task-93) is the UI half," which is how this gap was found
and closed during this session's Step -1 Existing Project Audit.
Back-filled here per Rule 49.1 Rule 1 so the master task plan and this
file agree with what's actually in the repo.

## Scope

Build the read side of the Admin Analytics Dashboard (Section 3.5):
commerce-focused metrics (orders, revenue, category performance, buyer
counts) over a selectable day window and optional category filter,
gated behind the `view-analytics` admin permission.

## Built

- `app/api/admin/analytics/route.ts` — `GET` handler. Auth via
  `getSessionAdmin()` (401 if absent), permission check via
  `hasAdminPermission(admin, "view-analytics")` (403 if missing).
  Parses `days` (clamped 1–365, default 30) and `categories`
  (comma-separated, validated against the fixed product-category
  list) query params, delegates to `getAdminAnalyticsSummary()`, and
  returns the standard `{ success, data, message }` shape (Rule 28).
- `lib/adminAnalyticsStats.ts` — the actual aggregation queries.
  Deliberately separate from `lib/analyticsStats.ts` (super-admin
  sitewide page-view traffic, Rule 41/task-91) since this is commerce
  analytics sourced from `Order`/`OrderItem`/`Product` plus Supabase
  Auth for buyer counts. Every exported function fails soft (returns
  a zeroed/empty shape rather than throwing), same contract as
  `lib/adminDashboardStats.ts`.

## Remaining

`app/admin/analytics/page.tsx` (task-93) — the UI that calls this
route and renders the dashboard. Not yet built.
