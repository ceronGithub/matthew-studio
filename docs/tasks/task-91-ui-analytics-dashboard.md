# task-91 — UI: super-admin Analytics dashboard (anonymized traffic analytics)

**Fulfills:** sitewide_technical_seo_specification.md, Section 4.4 —
"Super-admin Analytics dashboard (`/superAdmin/analytics`): visits over
time chart, top pages, top referrers, device breakdown, country-level
list/map — reads only from `PageViewDaily`." (Rule 41.3 governs the
exact shape.)

**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING,
item 11 (sitewide_technical_seo_specification.md). Third and final of
the 3 micro-tasks task-53 was split into per Rule 49 Step 4 (task-89
schema -> task-90 beacon/write path -> task-91, this file). task-53 is
now fully closed.

**Dependency:** task-90 [DONE] — `PageViewDaily` must already have a
live write path (`services/analytics.ts` -> `recordPageView()` via
`POST /api/analytics/pageview`) so this page has real data to read,
though the page itself fails soft to an empty/zero state if the table
is empty or the query errors.

---

## What changed

- `lib/analyticsStats.ts` — new read-only aggregation service,
  `getAnalyticsSummary(days = 30)`. Runs five `PageViewDaily` queries
  in parallel (`aggregate` for the total, `groupBy` for visits-by-date,
  top pages, top referrers, device breakdown, top countries), fills
  every day in the window (including zero-view days) so the chart
  never silently compresses, and fails soft to an all-empty shape on
  any query error — same contract as `lib/dashboardStats.ts`.
- `app/superAdmin/analytics/page.tsx` — new Server Component page.
  Fetches directly via `getAnalyticsSummary()` (Rule 31.1/31.2 — no
  client component, no API route needed for this read-only view).
  Renders: total-views card, a plain-CSS bar chart for visits over
  time (no charting library added — none was already a project
  dependency, and Rule 5/17 favor the lighter footprint), and four
  ranked-list panels (top pages, top referrers, device breakdown, top
  countries) via a shared local `RankedList` helper so all four stay
  visually consistent.
- `app/styles/analytics.css` — new stylesheet, tokens-only per Rule
  23.6/33, no raw colors or spacing values.
- `app/superAdmin/dashboard/page.tsx` — added an "Analytics" entry to
  `QUICK_ACTIONS`, and replaced the old "Phase 9" Analytics Summary
  stub (which referenced a since-renumbered phase) with a real link to
  `/superAdmin/analytics`. Removed the now-dead
  `.dashboardAnalyticsStub*` rules from `app/styles/superAdminDashboard.css`.

## Notes

- No new route matcher entry needed in `middleware.ts` — `/superAdmin/:path*`
  already covers `/superAdmin/analytics`.
- `npx tsc --noEmit` could not be run in this sandbox (no `node_modules`
  installed, same constraint noted on task-84 through task-90) — run
  locally before merging. Prisma `groupBy`/`aggregate` calls follow the
  same shape already used elsewhere in the repo (e.g.
  `lib/dashboardStats.ts`), so no new query patterns were introduced.
- No further work is queued under task-53/item 11's traffic-analytics
  scope. Item 11 itself stays `[~]` — task-50 (sitemap/robots), task-51
  (global error boundaries), and task-52 (idle session timeout) are
  still open.
