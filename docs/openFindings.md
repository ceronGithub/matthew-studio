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
  all. Not yet numbered as a task. Needs developer priority/scope
  decision before it's added to the plan.
- [2026-09-12] **Admin account lockout is display-only** (found
  during task-94). Section 5.3 calls for "locked after 5 failures,
  1-hour auto-recovery" — no stored field exists and
  `app/api/auth/login/route.ts` does not actually block logins once
  reached. `lib/adminAccountStatus.ts` only computes a "Locked"
  display badge live from `SecurityLog` `login_failed` counts.
  Enforcing the actual block is a separate, not-yet-numbered task.
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
- [2026-09-20] **Content PUT/revert routes don't enforce CSRF
  server-side.** `app/api/superadmin/content/[sectionId]/route.ts`'s
  PUT and `.../revert/route.ts`'s POST never call
  `isValidCsrfRequest()` (Rule 32.2) — unlike the auth endpoints that
  already use it. Not fixed here: task-115's new client code still
  sends `getCsrfHeader()` on every mutation (matches
  `useAdminProductForm.ts`'s convention), but the header currently
  goes unchecked server-side. Adding the check is a one-line change
  to task-114's already-shipped routes — flagged rather than made
  silently, since it touches code outside task-115's own scope.
- [2026-09-20] **taskPlan.md v60 cleanup note.** This file and
  docs/taskPlan.archive.md were created during the first v60 session
  touching taskPlan.md (Rule 49.2 §8): pointer shortened to the
  single-line format, narrative moved here, the `task-48+` open-ended
  range stub reclassified as a Phase heading, and fully-[DONE] phases
  (Phase 4 items 6/7/8, Phase 3 item 4, and item 5's Phase
  3/4-remainder/5/6 sub-scopes) archived. Phase 7 (CMS/Announcements/
  Media, where task-115 lives) and Phases 8/9/10 stayed in the main
  file since they're still open.
