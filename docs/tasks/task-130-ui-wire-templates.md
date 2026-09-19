# task-130 — UI: wire Templates (section + detail page) to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-121/122, split off task-124.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:**
- components/home/TemplatesSection.tsx (modified — remove static
  `PRODUCTS.filter(...)`, fetch `/api/shop/products?category=templates`)
- app/(public)/templates/[slug]/page.tsx (modified — remove
  `generateStaticParams`/static `getProduct()`, fetch the product by
  slug and the category list for siblings; add `export const dynamic
  = "force-dynamic"`)
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Same gap as task-126, for the Templates category: `TemplatesSection.tsx`
(homepage + `/templates`) and `[slug]/page.tsx` both read the static
catalog, so a DB-only Templates product never appears and its detail
link 404s.

## What this builds
Same pattern as task-126, applied to the `templates` category: scoped
API fetch replaces the static filter in the section component;
`[slug]/page.tsx` becomes `force-dynamic` and fetches the product +
siblings at request time. Templates is the one category with a
`variants` breakdown (Static/Dynamic/Modern) in `ProductDetail.tsx` —
confirm `toPublicProduct()` (lib/publicProduct.ts) already includes
`variants` in its mapped shape before wiring this one, since the other
5 categories don't exercise that field.

## Verification
1. `npm run build` — no errors; `/templates/[slug]` no longer in the
   static-params build output.
2. Create a Templates product in `/superAdmin` (with variants set) not
   present in `lib/productsData.ts` → appears on `/templates` and the
   homepage section; "View Details" opens and the variant selector
   still switches price correctly.
3. Unpublish it → disappears from both listings, detail page 404s.
