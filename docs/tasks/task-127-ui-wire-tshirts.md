# task-127 — UI: wire T-Shirts (section + detail page) to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-121/122, split off task-124.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:**
- components/home/TShirtsSection.tsx (modified — remove static
  `PRODUCTS.filter(...)`, fetch `/api/shop/products?category=tshirts`)
- app/(public)/tshirts/[slug]/page.tsx (modified — remove
  `generateStaticParams`/static `getProduct()`, fetch the product by
  slug and the category list for siblings; add `export const dynamic
  = "force-dynamic"`)
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Same gap as task-126, for the T-Shirts category: `TShirtsSection.tsx`
(used on both the homepage and `/tshirts`) and `[slug]/page.tsx` both
read the static `lib/productsData.ts` catalog, so a DB-only T-Shirts
product never shows up and its detail link 404s.

## What this builds
Same pattern as task-126, applied to the `tshirts` category: replace
the static filter in `TShirtsSection.tsx` with a scoped fetch to the
task-121 API, and convert `[slug]/page.tsx` from static generation to a
`force-dynamic` route that fetches the product and its siblings at
request time. `ProductDetail.tsx` is unchanged.

## Verification
1. `npm run build` — no errors; `/tshirts/[slug]` no longer in the
   static-params build output.
2. Create a T-Shirts product in `/superAdmin` not present in
   `lib/productsData.ts` → appears on `/tshirts` and the homepage
   section; "View Details" opens correctly.
3. Unpublish it → disappears from both listings, detail page 404s.
