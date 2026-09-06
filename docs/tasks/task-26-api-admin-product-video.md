# Task 26 — Admin product preview video upload route

Per product_media_upload_specification.md Sections 2.3, 3, 5, 6, 7, 8.

- `POST /api/admin/products/[productId]/media/video` — same 3 checks
  as Task 24/25. **No `processImage()`** — Sharp can't process video
  (Section 7's explicit warning); validate then `uploadToR2()`
  directly.
- Validate: type (`video/mp4`, `video/webm`, `video/quicktime`), size
  ≤100MB (Section 2.3's flagged assumption — using it as given).
- Key: `products/<productId>/video/<uuid>.<ext>` — original extension
  kept, never converted (Section 3).
- If `Product.previewVideoKey` already exists, `deleteFromR2()` the
  old one first (Section 7's "old files deleted before a replacement
  is written").
- Update `Product.previewVideoUrl`/`previewVideoKey`. Toast: `✓
  Preview video uploaded.`
- `DELETE /api/admin/products/[productId]/media/video` — same 3
  checks, `deleteFromR2()` the key, null out both fields. No spec'd
  toast for plain removal (only upload is listed in Section 8) — use
  the Rule 22.3 generic pattern: `✓ Preview video removed.`

**Deliberate deviation from spec, noted rather than silently
followed:** Section 5 also describes extending product DELETE to wipe
the entire `products/<productId>/` R2 prefix on product deletion.
Our `DELETE /api/admin/products/[productId]` (Task 21) is a Rule 6
**soft** delete (`deletedAt`, row kept) — destroying the R2 media at
that point would make the soft-delete's recoverability pointless.
Media is left in place on soft-delete; a hard-delete/cleanup pass (if
ever added) would be the right place to actually purge R2, not this
task.

Independently completable: only touches video fields. Does not touch
cover (Task 24) or gallery (Task 25). No UI yet (Task 27).
