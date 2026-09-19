# OPEN FINDINGS — matthew-studio (shop branch)

Unresolved gaps and follow-ups surfaced during builds/audits, one
dated line each. Not read during next-task lookup (Rule 49.2 §2) —
only consulted when investigating a specific flagged item.

- [2026-09-13] **Storefront not wired to Product DB table** (found
  during task-110). The public storefront (`/pricing`, `/shop`)
  reads product listings entirely from static data
  (`lib/categoryShowcaseData.ts` / `lib/productsData.ts`) —
  confirmed via grep, zero `prisma.product.*` calls exist outside
  `/api/admin/*` and `/api/buyer/downloads`. This means the
  pending-review approval flow (task-109/110/111/112) has no live
  public query to exclude pending-review products from — the
  admin-managed `Product` table isn't wired to the public site at
  all. **Converted to task-121 (API) / task-122 (UI) 2026-09-20** —
  see docs/tasks/task-121-api-public-products.md and
  docs/tasks/task-122-ui-storefront-wire-product-db.md.
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
  (task-115) — server now actually validates it. NOTE: could not run
  `npx tsc --noEmit` (Rule 20) — this sandbox clone has no
  `node_modules` installed. Run it in the real dev environment before
  merging.
- [2026-09-20] **taskPlan.md v60 cleanup note.** This file and
  docs/taskPlan.archive.md were created during the first v60 session
  touching taskPlan.md (Rule 49.2 §8): pointer shortened to the
  single-line format, narrative moved here, the `task-48+` open-ended
  range stub reclassified as a Phase heading, and fully-[DONE] phases
  (Phase 4 items 6/7/8, Phase 3 item 4, and item 5's Phase
  3/4-remainder/5/6 sub-scopes) archived. Phase 7 (CMS/Announcements/
  Media, where task-115 lives) and Phases 8/9/10 stayed in the main
  file since they're still open.
- [2026-09-20] **Public shop API has no rate limit** (found during
  task-121). Rule 32.1 asks for a general 100 req/15 min/IP limit on all
  endpoints, but `lib/rateLimit.ts` writes one DB row per call, so
  putting it on a browse-heavy GET would add a write per page view. No
  public GET route uses it today. Decide: apply it, or use a cheaper
  edge/in-memory limit for public reads.
