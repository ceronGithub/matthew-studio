# OPEN FINDINGS — matthew-studio (shop branch)

Unresolved gaps and follow-ups surfaced during builds/audits, one
dated line each. Not read during next-task lookup (Rule 49.2 §2) —
only consulted when investigating a specific flagged item.

- [2026-09-13] ~~Storefront not wired to Product DB table~~ **FULLY
  RESOLVED (2026-09-20).** task-121/122 (API + /products grid),
  task-124/126..131 (category pages, [slug] pages, homepage sections),
  and task-125 (seed script) are all done and verified. Kept struck
  through for history.
- [2026-09-12] ~~Admin account lockout is display-only~~ **RESOLVED
  (2026-09-20, task-123).** `app/api/auth/login/route.ts` now rejects
  admin/superAdmin logins with 5 failures in 60 minutes before the
  password check (generic 401, logs `admin_login_locked`, which now
  counts as a Gatekeeper strike). Kept struck through for history.
- [2026-09-07] **task-41 numbering collision — reserved renumber, not
  yet built.** `task-41` was used for the (DONE) buyer-recovery
  middleware gate. The still-open admin_account_specification.md
  Analytics item that also wanted `task-41` is reserved as
  **task-65** instead — now built and closed as task-65/92/93 (see
  docs/taskPlan.archive.md). Note kept here only as a reminder never
  to create `docs/tasks/task-41-analytics.md` under the old number.
- [2026-09-20] ~~task-114's list endpoint is a duplicate of the detail
  route~~ **RESOLVED (2026-09-20).** Re-checked during task-116/117
  pointer lookup: `app/api/superadmin/content/route.ts` now has a
  real `prisma.contentSection.findMany()` with a FIX NOTE comment
  dated 2026-09-20, and `.../[sectionId]/versions/route.ts` exists —
  matches taskPlan.md's task-115 entry, which already logs this as
  fixed. Original finding is stale; kept struck through for history.
- [2026-09-20] ~~Content PUT/revert routes don't enforce CSRF
  server-side.~~ **RESOLVED (2026-09-20).** Added `isValidCsrfRequest()`
  (Rule 32.2) as the first check inside `content/[sectionId]/route.ts`'s
  PUT and `.../revert/route.ts`'s POST, matching the exact pattern
  already used in `app/api/admin/products/route.ts` and other
  mutating admin routes. Client already sent `getCsrfHeader()`
  (task-115) — server now actually validates it. `npx tsc --noEmit`
  was run on 2026-10-03: the CSRF lines (import + check) type-check
  fine, but the full project is NOT clean — see the 2026-10-03 tsc
  entry at the bottom of this file. Kept struck through for history.
- [2026-09-20] **taskPlan.md v60 cleanup note.** This file and
  docs/taskPlan.archive.md were created during the first v60 session
  touching taskPlan.md (Rule 49.2 §8): pointer shortened to the
  single-line format, narrative moved here, the `task-48+` open-ended
  range stub reclassified as a Phase heading, and fully-[DONE] phases
  (Phase 4 items 6/7/8, Phase 3 item 4, and item 5's Phase
  3/4-remainder/5/6 sub-scopes) archived. Phase 7 (CMS/Announcements/
  Media, where task-115 lives) and Phases 8/9/10 stayed in the main
  file since they're still open.
- [2026-09-20] ~~Public shop API has no rate limit~~ **RESOLVED
  (2026-09-27).** Built `lib/publicRateLimit.ts` -- an in-memory
  sliding-window limiter (not DB-backed) -- and wired it into both
  `app/api/shop/products/route.ts` and
  `app/api/shop/products/[slug]/route.ts` at Rule 32.1's General API
  tier (100 req/15min/IP), checked before any Prisma call. Chose the
  "cheaper edge/in-memory" option this finding proposed over the
  DB-backed `lib/rateLimit.ts`, since that writes one row per call and
  this route fires on every storefront page view. Trade-off (counts
  are per-instance, reset on cold start) is documented in the new
  file's header. Kept struck through for history.
- [2026-09-20] ~~/superAdmin/media has no dashboard entry point.~~
  **RESOLVED (2026-10-03).** Added a "Media Library" quick-action card
  to `app/superAdmin/dashboard/page.tsx`. The search-box limit is
  accepted as is: R2 can only list by prefix (no substring search) and
  uploaded files are named with random UUIDs, so a server-side filename
  search would find nothing useful. The grid already tells the admin to
  load more files to search further. Kept struck through for history.
- [2026-09-20] ~~task-131 not build-verified in this sandbox.~~
  **RESOLVED (2026-09-20).** Vic confirmed the build and admin CMS
  create/unpublish check locally for both task-131 and task-125. Kept
  struck through for history.
- [2026-09-20] ~~task-49 is an unspecced stub — flagged before
  building.~~ **RESOLVED (2026-10-03).** Full spec read and broken into
  9 micro-tasks, task-49a through task-49i (docs/tasks/task-49*.md),
  approved by Vic with v1 defaults: one tool with two modes, no OCR,
  no audio, no DOCX, generic invoice patterns only, no schema change.
  Two points still to confirm at build time: pdf-lib is added for
  Image to PDF/merge/split because pdf.js cannot write PDFs (task-49c),
  and the missing-token filename behavior (task-49a). Kept struck
  through for history.
- [2026-10-03] ~~pdf.js worker loading unverified (task-49b).~~
  **RESOLVED at build level (2026-10-03).** Built a throwaway Next.js 16
  app that imports `lib/fileTools/pdfJsLoader.ts` from a client page:
  `next build` compiled with no `canvas` error, no alias needed, and the
  worker was emitted as `.next/static/media/pdf.worker.min.*.mjs` and
  referenced by the page bundle. The first run with a real PDF in a
  browser stays as a check in task-49g's DONE WHEN, where the loader is
  first used. Kept struck through for history.
- [2026-10-03] **`npx tsc --noEmit` reports 24 errors on the shop branch
  (Rule 20 wants zero).** Same count with and without the open-findings
  cleanup, so all of it was already there. Ran against Prisma 7.10.0,
  the version in the lockfile. Three groups: (a) 17 Json-column errors —
  interfaces and `Record<string, unknown>` passed to Prisma Json fields
  (order actions + production-stage routes, buyer actions route,
  content PUT/revert routes, auditLog.ts, vaultHelpers.ts,
  seedProducts.ts); (b) 4 errors in `lib/adminAnalyticsStats.ts` —
  it reads `product` on OrderItem, but the schema's OrderItem has no
  `product` relation (only a `productId` string), so those queries
  would fail at runtime; (c) 3 errors in `services/analytics.ts`
  (lines 55-57) — `string | null` passed where `string` is expected.
  The sandbox could only generate the Prisma client with a stub engine,
  which does not affect types.
