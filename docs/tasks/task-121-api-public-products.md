# task-121 — API: public product list/detail (live Product table)

**Fulfills spec:** admin_account_specification.md Section 9.2 (approval
flow) — closes the gap logged in docs/openFindings.md
[2026-09-13]: the storefront has no live query to exclude
pending-review products from because it never queries `Product` at
all.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library
(added as a follow-on to the Phase 6 approval-flow work).
**Dependency:** none — `Product` model and `status` field already
exist (task-109/110/111/112).
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** app/api/shop/products/route.ts (new),
app/api/shop/products/[slug]/route.ts (new)
**DONE WHEN:** the 3 verification steps below all pass.

## What this builds
`app/api/shop/products/route.ts`:
- `GET` — public, no auth. Returns products where
  `status: "published"` and `deletedAt: null` only — pending-review
  and draft products are never exposed. Supports `category` and
  `search` query params (mirrors `lib/productsData.ts`'s existing
  filter shape so the UI swap in task-122 is a drop-in). Paginated.

`app/api/shop/products/[slug]/route.ts`:
- `GET` — public, no auth. Single product by slug, same
  `status: "published"` + `deletedAt: null` filter. 404 (via
  `notFound()` pattern, Rule 31.10) if not found or not published —
  never distinguishes "doesn't exist" from "exists but pending/draft"
  in the response (avoids leaking unpublished product existence).

Both routes: `export const dynamic = "force-dynamic"`, Rule 28
response shape, read-only so no CSRF check needed (GET only).

## Verification
1. `GET /api/shop/products` → only `published` products returned;
   seed one `draft` and one `pending-review` product and confirm
   neither appears.
2. `GET /api/shop/products/[slug]` on a published product → 200 with
   full product data.
3. `GET /api/shop/products/[slug]` on a pending-review or
   non-existent slug → same 404 shape for both.
