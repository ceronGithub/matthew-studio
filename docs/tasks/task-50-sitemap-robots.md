# task-50 — sitemap-robots — app/sitemap.ts + app/robots.ts

**Fulfills:** sitewide_technical_seo_specification.md §4.1 (SEO Infrastructure)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 11
**Dependency:** none
**NEEDS:** none
**SETUP:** set `APP_URL` (already used by reset-password / create-admin emails) to the live site origin, e.g. https://example.com, in production env
**FILES TO TOUCH:** lib/siteUrl.ts, app/sitemap.ts, app/robots.ts (all new)
**DONE WHEN:**
- /sitemap.xml lists every public static page, every published non-deleted product at /<category>/<slug>, and every blog post at /blog/<slug>; each URL appears once.
- Buyer, admin, super-admin, auth, api, checkout and order-confirmation URLs are never in the sitemap.
- /robots.txt allows public routes, disallows those private areas, and points to the sitemap URL.
- A database error never breaks /sitemap.xml: it falls back to static pages and blog posts only.

## Notes
- Blog posts come from lib/blogData.ts (static, no DB); `publishedAt` is a display string, so lastModified is parsed from it and left out if it will not parse.
- Static pages get no lastModified (no honest date exists for them).
- The product "bulk-file-converter" in file-tools resolves to the same URL as the static tool page (task-49i); URLs are de-duplicated.
- Spec §4.1 asks robots.txt to Disallow the super-admin path. robots.txt is public, so that line also tells visitors the path exists. Followed the spec as written; one-line change in app/robots.ts if you want it dropped (logged in openFindings.md).
