# task-129 — UI: wire Tutorials (section + detail page) to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-121/122, split off task-124.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:**
- components/home/TutorialsSection.tsx (modified — remove static
  `PRODUCTS.filter(...)`, fetch `/api/shop/products?category=tutorials`)
- app/(public)/tutorials/[slug]/page.tsx (modified — remove
  `generateStaticParams`/static `getProduct()`, fetch the product by
  slug and the category list for siblings; add `export const dynamic
  = "force-dynamic"`)
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Same gap as task-126, for the Tutorials category: `TutorialsSection.tsx`
(homepage + `/tutorials`) and `[slug]/page.tsx` both read the static
catalog, so a DB-only Tutorials product never appears and its detail
link 404s.

## What this builds
Same pattern as task-126, applied to the `tutorials` category: scoped
API fetch replaces the static filter in the section component;
`[slug]/page.tsx` becomes `force-dynamic` and fetches the product +
siblings at request time. `ProductDetail.tsx` is unchanged.

## Verification
1. `npm run build` — no errors; `/tutorials/[slug]` no longer in the
   static-params build output.
2. Create a Tutorials product in `/superAdmin` not present in
   `lib/productsData.ts` → appears on `/tutorials` and the homepage
   section; "View Details" opens correctly.
3. Unpublish it → disappears from both listings, detail page 404s.
