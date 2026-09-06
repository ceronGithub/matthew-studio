# Task 24 — Admin product cover image upload route

Per product_media_upload_specification.md Sections 2.1, 3, 5, 7.

- `POST /api/admin/products/[productId]/media/cover` — dedicated
  route, NOT a generic `/api/upload` (this codebase has no such
  endpoint anywhere; the only prior precedent,
  `app/api/buyer/profile/avatar/route.ts`, is also a dedicated
  per-feature route — following that convention, not the spec's
  Section 5 literal wording).
- `getSessionAdmin()` + `hasAdminPermission(admin, "manage-products")`
  + `isValidCsrfRequest()` — same 3 checks as every Task 21 route.
- Validate: type (jpeg/png/webp/gif), size ≤5MB — same
  `ACCEPTED_TYPES`/`MAX_FILE_SIZE` constants as the avatar route.
- `processImage()` (existing `lib/imageProcessor.ts`, 1200px/80%
  default — no need to override like the avatar route's 400px).
- Upload to the **fixed** key `products/<productId>/cover.webp`
  (Section 3 — always this exact filename, so replacing is a plain
  overwrite). If `Product.coverImageKey` already exists and differs
  (shouldn't normally happen since the key is fixed, but the field
  could point elsewhere from a manual DB edit), `deleteFromR2()` the
  old key first.
- Update `Product.coverImageUrl`/`coverImageKey`. Toast text per
  Section 8: `✓ Cover image uploaded.`

Independently completable: only touches the cover fields. Does not
touch gallery (Task 25) or video (Task 26). No UI yet (Task 27).
