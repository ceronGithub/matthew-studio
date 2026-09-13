# task-119 — API: media library (list existing R2 uploads)

**Fulfills spec:** Section 9.3 (media/asset library).
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** None.

## What this builds
Adds `listR2Objects()` to `services/r2.ts` using
`ListObjectsV2Command` (already have `S3Client` exported there — no
new client needed). No new Prisma model: per the spec's own wording
("a page listing everything already uploaded to Cloudflare R2"),
this reads the bucket directly rather than maintaining a duplicate
tracking table that could drift out of sync with what's actually in
R2 (Rule 3 — no useless duplication).

`app/api/superadmin/media/route.ts`:
- `GET` — paginated (R2's own `ContinuationToken`, not offset-based),
  optional `prefix` param to filter by folder
  (`avatars/`, `products/`, `banners/`, `receipts/`, `documents/`,
  per Rule 35.8's folder convention). Returns key, size, lastModified,
  and the public CDN URL (`NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` +
  key) for each object.

Super-admin only.

## Verification
1. `GET /api/superadmin/media` → 200, lists objects currently in the
   bucket (empty array is fine on a fresh bucket).
2. `GET ...?prefix=products/` → only objects under that folder.
3. Upload a test product image via the existing product-media flow,
   then re-fetch → the new object appears in the list.
