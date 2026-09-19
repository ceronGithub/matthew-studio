# task-122 — UI: wire /shop and /pricing to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 —
same gap as task-121, UI side.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121 (public API must exist first).
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:** components/products/ProductsGrid.tsx (modified),
app/(public)/products/page.tsx (modified), lib/hooks/useShopProducts.ts
(new), app/styles/products.css (modified — skeleton + pagination)

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

## Note added during task-121 (2026-09-20)
Verified in the repo: `app/(public)/shop/page.tsx` is only a
`redirect("/pricing")` — it renders no products. The real product grid
is `app/(public)/products/page.tsx` -> `components/products/ProductsGrid.tsx`
(reads static `PRODUCTS`; its SortMode values match the task-121 `sort`
param). `/pricing` uses lib/pricingData.ts tiers, not `PRODUCTS`. So the
swap belongs in `/products` (and the category pages `templates`,
`tshirts`, `ai-videos`, `file-tools`, `tutorials`, `game-characters` and
their `[slug]` pages, plus the homepage sections that import `PRODUCTS`),
not `/shop`. Confirm scope with the developer before starting.

## Status
[DONE] 2026-09-20, scope narrowed to the `/products` grid (developer
confirmed). `/shop` and `/pricing` were left alone: `/shop` only
redirects, and `/pricing` uses tier data, not `PRODUCTS`. The grid now
sends search/category/sort/page to `/api/shop/products` (search debounced
300ms, stale requests aborted), with skeleton, error+retry, and empty
states (Rule 25) and page buttons. Category pages, detail pages, and the
homepage sections are NOT wired yet — that is task-124; seeding the DB
from the static catalog is task-125. Until then `/products` shows only
products created in the admin. Not run in a browser in the sandbox.
