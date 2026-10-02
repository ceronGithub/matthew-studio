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
- [2026-09-07] ~~task-41 numbering collision — reserved renumber.~~
  **RESOLVED (2026-10-03).** `task-41` stays the buyer-recovery
  middleware gate (docs/tasks/task-41-recovery-setup-gate.md is the only
  task-41 file). The Analytics item that wanted the same number was
  built as task-65/92/93 and is marked [DONE] in
  docs/taskPlan.archive.md. Nothing left to do. Kept struck through for
  history.
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
- [2026-09-20] ~~taskPlan.md v60 cleanup note.~~ **CLOSED
  (2026-10-03).** Record only, nothing to fix: during the first v60
  session touching taskPlan.md (Rule 49.2 §8) the pointer was shortened
  to one line, its narrative moved here, the `task-48+` range stub
  became a Phase heading, and fully-[DONE] phases were archived to
  docs/taskPlan.archive.md. Kept struck through for history.
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
- [2026-10-03] task-49d follow-ups, all browser checks for task-49f/49g: (a) pdf.js warned `standardFontDataUrl` is missing when opening a PDF that uses non-embedded standard fonts (Helvetica etc.) — text reading was fine, but check whether PDF to JPG/PNG shows wrong glyphs for such PDFs in a browser; if so, `getDocument` in pdfJsLoader/conversionEngine needs that parameter; (b) merge has no combined-size limit (each file is capped at 25MB, up to 50 files could be ~1.25GB in memory); (c) `maxPdfPages = 100` is an unconfirmed assumption.
- [2026-10-03] task-50: `app/robots.ts` Disallows `/superAdmin/` as spec §4.1 asks, but robots.txt is public, so that line also tells anyone the path exists (the spec's own reason for the rule is to avoid exactly that). The path is already auth-, TOTP- and Gatekeeper-protected. Decide whether to keep it; removing it is one line in `DISALLOWED_PATHS`.
- [2026-10-03] task-50: `lib/siteUrl.ts` reads `APP_URL` and falls back to `http://localhost:3000` when it is unset. Before deploy, confirm `APP_URL` is set to the live origin in production, or `/sitemap.xml` and the robots.txt sitemap line will point at localhost. Also check `/sitemap.xml` against the real database in a browser (only tested with a stubbed database so far).
- [2026-10-03] task-51: Spec §4.2 recommends per-segment `error.tsx` for `app/buyer/`, `app/(public)/shop/` and other data-fetching routes so a failed fetch keeps the account shell (nav/sidebar) visible instead of falling back to the root boundary. Not built in task-51. `components/shared/ErrorState.tsx` is made for it: each segment file is a ~10-line wrapper like `app/error.tsx`. Decide which segments get one (buyer, admin, superAdmin, shop).
- [2026-10-03] task-51: Protocol Rule 31.10 shows `reset` as the error boundary's retry prop, but the installed Next.js 16.3.0 documents `retry` as the stable "Try again" prop (re-fetches the segment; `reset` only clears the error state). task-51 uses `retry`. Browser checks still to do: force a render error to see the "Try again" flow, force one in `app/layout.tsx` to see `global-error.tsx` (including the saved dark theme), and confirm `/this-does-not-exist` in a real browser. Only the 404 was smoke-tested here (HTTP 404 and branded content confirmed); the Google Fonts fetch is blocked in the sandbox, so fonts were not checked.
- [2026-10-03] task-54 coupon plan: two points to confirm before building. (1) task-54d reserves a coupon use at order creation (race-safe), so an abandoned PENDING order keeps its use; the alternative, counting at payment, can oversell a limited code. (2) task-54f/54g (super-admin coupon management) are not in any spec; the spec only says admin-side management belongs in the super-admin spec. v1 default is super-admin only, although ordinary admins already have a "Manage Promotions" permission value in lib/hooks/useCreateAdminForm.ts.
- [2026-10-03] task-54c: `zod` is not a direct dependency (not in package.json, not imported anywhere else in app/ or lib/) — it is only present in node_modules as a transitive package (v4.4.3). The new validate-coupon route imports it because the task and Rule 31.3 call for zod body validation, so run `npm install zod` to make it a real dependency (and commit package.json + package-lock.json) before deploying.
- [2026-10-03] task-54c: the `csrf_token` cookie is only issued by middleware.ts on its matcher routes (/buyer, /admin, /superAdmin, /auth, /api/auth). `/checkout` and `/api/checkout/*` are outside that matcher, so a guest who goes straight to checkout without visiting an /auth page may have no csrf_token cookie, and validate-coupon (which checks CSRF per the task) would return 403 for them. Decide before task-54e: add the checkout paths to the middleware matcher (or issue the cookie another way). Not changed in 54c — outside its FILES TO TOUCH.
- [2026-10-03] task-54d: PayMongo checkout sessions accept only positive line amounts, so a coupon order sends ONE folded line ("Order items (promo CODE)", with the discount in its description) instead of the itemised cart (`buildPayMongoLineItems` in lib/couponPricing.ts). The PayMongo page shows the exact charged total but not the per-item breakdown for coupon orders. Also: a code that covers the whole item total (e.g. 100% off) is refused with a clear message because PayMongo cannot charge a zero item line. Decide later whether to support zero-total orders (skip PayMongo, mark PAID) — and check in a real PayMongo test session that the folded line and the shipping line sum to `Order.total`.
- [2026-10-03] task-54d: scope deviation — `app/api/orders/[orderId]/retry-payment/route.ts` (not in the task's FILES TO TOUCH) got a one-line change. It rebuilds PayMongo lines from OrderItem snapshots, which are pre-discount, so without this a retried coupon order would have been charged the full price. Not tested against a real database or PayMongo here (no Prisma engine in the sandbox): browser/DB checks to do — apply a coupon at checkout, confirm Order.total and the PayMongo amount match, force a PayMongo failure and confirm usageCount goes back down, and retry a FAILED coupon order.
- [2026-10-03] task-54e: Rule 18.1 strips `-` (and spaces, `=`) from every text input, so `PromoCodeField` cannot accept a hyphen — but task-54f's DONE WHEN allowed hyphens in coupon codes. A code like `SAVE-10` could be created yet never typed at checkout. task-54f's DONE WHEN was changed to letters and digits only. Revisit only if hyphenated codes are wanted (then the field's filter would need a documented exception).
- [2026-10-03] task-54e: browser checks still to do (nothing here could run the app): open /checkout in a fresh private window and confirm a `csrf_token` cookie now appears, then Apply a valid code (discount line, new shipping and total, success toast), an invalid code (error toast, totals unchanged), Remove (original totals back), and a free-shipping code on a t-shirt cart (Shipping shows "Free"). Check at 375px, 768px, 1280px and in light and dark theme. Side effect to know: `/checkout` now goes through middleware, so it also gets the Gatekeeper ban check and one Supabase `getUser` lookup per request when a session cookie exists.
- [2026-10-03] task-54g: Rule 31.7 asks for react-hook-form, but it is not in package.json and no form in the repo uses it (other forms use useState hooks). The coupon form follows the repo pattern and validates with the shared zod schema. Decide later whether to adopt react-hook-form project-wide.
- [2026-10-03] task-54g: CouponForm.tsx (166 lines) and CouponManager.tsx (182 lines) are over the ~150-line component guideline. Both are mostly JSX; the table and the data logic are already split out. Split further only if they grow.
