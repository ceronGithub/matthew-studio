# task-131 — UI: wire AI Videos (section + detail page) to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-121/122, split off task-124.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:**
- components/home/AIVideosSection.tsx (modified — remove static
  `PRODUCTS.filter(...)`, fetch `/api/shop/products?category=ai-videos`)
- app/(public)/ai-videos/[slug]/page.tsx (modified — remove
  `generateStaticParams`/static `getProduct()`, fetch the product by
  slug and the category list for siblings; add `export const dynamic
  = "force-dynamic"`)
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Same gap as task-126, for the AI Videos category: `AIVideosSection.tsx`
(homepage + `/ai-videos`) and `[slug]/page.tsx` both read the static
catalog, so a DB-only AI Videos product never appears and its detail
link 404s. This is the last of the 6 categories split from task-124 —
once this and task-126..130 are all [DONE], flip the task-124 parent
line to [DONE] (Rule 49.1 Rule 6).

## What this builds
Same pattern as task-126, applied to the `ai-videos` category: scoped
API fetch replaces the static filter in the section component;
`[slug]/page.tsx` becomes `force-dynamic` and fetches the product +
siblings at request time. `ProductDetail.tsx` is unchanged.

## Verification
1. `npm run build` — no errors; `/ai-videos/[slug]` no longer in the
   static-params build output.
2. Create an AI Videos product in `/superAdmin` not present in
   `lib/productsData.ts` → appears on `/ai-videos` and the homepage
   section; "View Details" opens correctly.
3. Unpublish it → disappears from both listings, detail page 404s.
4. With all 6 (task-126..131) done, flip task-124's parent checkbox to
   [DONE] in docs/taskPlan.md and update the NEXT UP pointer to
   task-125 (the seed script, same dependency, still open).
