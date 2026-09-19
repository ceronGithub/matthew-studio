# task-124 — UI: wire category, detail, and homepage pages to the live Product API

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-122, which only wired the `/products` grid.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** none
**FILES TO TOUCH:** app/(public)/{templates,tshirts,ai-videos,file-tools,
tutorials,game-characters}/page.tsx and their `[slug]/page.tsx`,
components/home/*Section.tsx and FeaturedProducts.tsx (whichever import
`PRODUCTS`), components/compare/ProductCompareTool.tsx.
**DONE WHEN:** the 3 verification steps below pass.

## Why this exists
Found during task-122: product cards link to `/[category]/[slug]`, and
those detail pages look the slug up in the static `PRODUCTS` array and
call `notFound()` otherwise. A product an admin creates in the database
shows up on `/products` but its "View Details" link 404s. The category
pages, homepage sections, and compare tool also still read static data.
Split by page group when building (Rule 49 Step 4) — this is larger than
one micro-task.

## Verification
1. Publish a new product in `/superAdmin/products`; open it from
   `/products` -> "View Details". Expected: its detail page renders.
2. Set it to pending-review. Expected: its detail URL now 404s.
3. Its category page and the homepage section for that category list
   only published DB products.
