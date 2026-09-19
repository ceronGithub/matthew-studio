# task-126 — UI: wire Game Characters (section + detail page) to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-121/122, split off task-124.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:**
- components/home/GameCharactersSection.tsx (modified — remove static
  `PRODUCTS.filter(...)`, fetch `/api/shop/products?category=game-characters`)
- app/(public)/game-characters/[slug]/page.tsx (modified — remove
  `generateStaticParams`/static `getProduct()`, fetch
  `/api/shop/products/game-characters` list for siblings and
  `/api/shop/products/[slug]` for the product; add `export const dynamic
  = "force-dynamic"` since content is no longer known at build time)
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Both the homepage's `<GameCharactersSection />` and the standalone
`/game-characters` page (which just renders that same component) read
`PRODUCTS` filtered to `category === "game-characters"` at module scope.
The `[slug]/page.tsx` detail page does the same via `generateStaticParams`,
which only knows about products that existed in `lib/productsData.ts` at
build time. A Game Characters product created in the admin CMS (DB-only)
never appears in either place, and its detail link 404s.

## What this builds
- `GameCharactersSection.tsx`: replace the static filter with a fetch to
  the existing task-121 API scoped to this category (small, single-purpose
  fetch — reuse `useShopProducts`'s abort/error pattern, not the full hook,
  since this section doesn't need search/sort/pagination). Keep the
  loading/empty/error states (Rule 25) consistent with `ProductsGrid`.
- `[slug]/page.tsx`: drop `generateStaticParams` and the static lookup;
  fetch the product server-side by slug, `notFound()` on a 404 response
  (same behavior as today, new source), and fetch the category's product
  list for the "More in this category" siblings strip. Mark the route
  `force-dynamic` since it can no longer be statically generated.
- No change to `ProductDetail.tsx` — it already takes `product`/`siblings`
  as props regardless of where they came from.

## Verification
1. `npm run build` — no errors; confirm `/game-characters/[slug]` no
   longer appears in the static-params build output.
2. Create a Game Characters product in `/superAdmin` that is NOT in
   `lib/productsData.ts` → it appears on `/game-characters` and on the
   homepage section, and its "View Details" link opens (no 404).
3. Unpublish that same product → it disappears from both listings and
   its detail page 404s.
