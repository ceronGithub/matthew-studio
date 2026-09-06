# Task 27 — Media upload UI in the admin product form

Per product_media_upload_specification.md Sections 4, 8, 9.

- Replaces `AdminProductForm.tsx`'s "Coming soon" media placeholder
  (Task 23) with the real Media section: **only rendered in edit
  mode** — a product needs to exist (have an id) before media can be
  attached to `products/<productId>/...`, so a brand-new create form
  still shows a short explanatory note ("Save the product first, then
  add media") rather than the upload controls. This matches Task 23's
  original placeholder copy, now literally true instead of a stub.
- Cover Image: single file picker, shows current image + "Replace".
- Gallery Images: multi-file picker, thumbnail strip, "Add More" up
  to 8, per-image × delete. Reorder drag handles deferred (Task 25's
  note) — strip is add/delete/view only for now.
- Preview Video: single file picker, `<video>` preview once uploaded,
  "Replace"/"Remove".
- Client-side validation before any network request (Section 4's
  explicit requirement): check type/size against the same limits as
  Tasks 24-26 and show an inline error (Rule 34.1 pattern) before
  attempting upload — never let an oversized file start uploading
  only to fail server-side.
- Loading state per file during upload (Rule 25) — a busy
  spinner/disabled state, not a true byte-level progress bar (that
  would need `XMLHttpRequest.upload.onprogress`; this app's other
  upload, the avatar route, doesn't have one either — consistent with
  existing precedent, noted as a possible future enhancement rather
  than silently scoped out).
- Toasts exactly as specified in Section 8's table (upload success,
  removal, too-large, unsupported-type).

Independently completable: consumes Task 24/25/26's routes. Closes
the full product_media_upload_specification.md loop for `/admin/products`
(the `/superAdmin/products` side the spec also mentions is out of
scope — no super-admin product UI exists yet, per Section 5C item 5's
status).
