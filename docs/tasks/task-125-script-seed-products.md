# task-125 — Script: seed Product table from the static catalog

**Fulfills spec:** admin_account_specification.md Section 9.2 — follow-on
to task-122.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-121.
**NEEDS:** task-121
**SETUP:** `npx prisma db push && npx prisma generate` if not already run
**FILES TO TOUCH:** scripts/seedProducts.ts (new), package.json
(`seed:products` script)
**DONE WHEN:** the 2 verification steps below pass.

## Why this exists
`/products` now reads the database (task-122). No seed script exists, and
the 18 products in `lib/productsData.ts` were never inserted, so a fresh
database shows an empty grid until an admin creates products by hand.

## What this builds
A one-off script: for each entry in `PRODUCTS`, upsert by `slug` with
`status: "published"`, mapping `price.startingPrice` -> `startingPrice`,
`price.{managed,selfHosted,custom}` -> `pricingDetails`, `rating` ->
`ratingAverage/ratingCount`, `dateAdded`, `trendingScore`, `variants`.
Run against DIRECT_URL like `scripts/runBackup.ts`. Re-runnable (upsert),
never deletes anything.

## Verification
1. `npm run seed:products` -> 18 products, re-run makes no duplicates.
2. `/products` lists them; `GET /api/shop/products` returns totalCount 18.
