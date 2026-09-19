# task-122 — UI: wire /shop and /pricing to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 —
same gap as task-121, UI side.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121 (public API must exist first).
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:** app/(public)/shop/page.tsx (modified),
app/(public)/pricing/page.tsx (modified),
lib/hooks/useShopProducts.ts (new)

**DONE WHEN:** the 3 verification steps below all pass.

## What this builds
`lib/hooks/useShopProducts.ts` — new client hook (Rule 31.2/31.4)
wrapping fetch calls to `/api/shop/products` and
`/api/shop/products/[slug]`. Handles loading/error/empty states per
Rule 25.

`app/(public)/shop/page.tsx` — swap `PRODUCTS` (from
`lib/productsData.ts`) for `useShopProducts()`. Keep
`CATEGORY_SHOWCASE` (`lib/categoryShowcaseData.ts`) as-is — that's
category metadata, not product listings, and is out of scope for
this fix.

`app/(public)/pricing/page.tsx` — same swap for whatever subset of
`PRODUCTS` it currently reads.

Do NOT delete `lib/productsData.ts` yet — leave it in place until a
developer confirms nothing else still imports it (grep shows admin
product forms may reference its type definitions,
e.g. `ProductCategorySlug`, `ProductVariant`); only the static
`PRODUCTS` array's usage for public listings is being replaced here.

## Verification
1. Publish a new product via `/superAdmin/products` (or admin
   equivalent) with `status: "published"` → it appears on `/shop`
   without a code change or redeploy.
2. Set a product's status to `pending-review` → it disappears from
   `/shop` and `/pricing` immediately.
3. Loading and empty states render correctly (Rule 25) — throttle the
   network tab and confirm a skeleton shows, then confirm an empty
   category shows the Rule 25.3 empty state, not a blank grid.
