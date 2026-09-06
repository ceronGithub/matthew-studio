# Task 25 — Admin product gallery image routes

Per product_media_upload_specification.md Sections 2.2, 3, 6, 7, 8.

- `POST /api/admin/products/[productId]/media/gallery` — same 3
  checks (auth/permission/CSRF) + same validate→processImage()→
  uploadToR2() pipeline as Task 24, but:
  - Key is randomized: `products/<productId>/gallery/<uuid>.webp`
    (Section 3 — only the cover uses a fixed name).
  - Reject with a clear message if the product already has 8
    `ProductGalleryImage` rows (Section 2.2's cap, tested in Section
    9's checklist: "rejects a 9th with a clear message").
  - Creates a `ProductGalleryImage` row (`sortOrder` = current count,
    so new images append to the end of the strip).
  - Toast per Section 8: `✓ Image added to gallery.`
- `DELETE /api/admin/products/[productId]/media/gallery/[imageId]` —
  same 3 checks, `deleteFromR2()` the image's key, then delete the
  `ProductGalleryImage` row. 404 if the row doesn't exist or belongs
  to a different product. Toast: `✓ Image removed.`
- Drag-to-reorder (Section 4's "reorderable strip") is deferred — a
  `sortOrder` field exists on the model for it, but wiring a reorder
  endpoint is a smaller follow-up once add/remove works, not blocking
  the core loop. Noted here rather than silently dropped.

Independently completable: only touches
`ProductGalleryImage`/gallery R2 keys. Does not touch cover (Task 24)
or video (Task 26). No UI yet (Task 27).
