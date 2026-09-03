# Product Media Upload (Images & Videos) — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Today, product creation only supports a single optional image (`admin_account_specification.md` Section 3.2.2: "Image/Thumbnail, max 5MB") — no gallery, no video, even though **AI Videos is one of the 6 marketplace categories** and would have nothing to actually preview under the current spec. This document expands product media to a proper set — cover image, gallery images, and preview video — and confirms all of it (both admin and super-admin uploads) lands in **Cloudflare R2**, per the service assignment already set in Rule 35 / Rule 35.6.

Applies to both `/admin/products` (admin spec Section 3.2.2) and `/superAdmin/products` (super-admin spec Section 3.10) — same upload component, same storage rules, same R2 destination, regardless of which account type uploads it.

---

## 2. MEDIA TYPES

### 2.1 — Cover Image (required, 1 per product)

- The thumbnail shown in product cards, category grids, and search results.
- Processed through Rule 35.6's existing pipeline: resize to max 1200px, convert to WebP, 80% quality.
- Max upload size (pre-processing): 5MB. Accepted types: JPEG, PNG, WebP, GIF.

### 2.2 — Gallery Images (optional, up to 8 per product)

- Additional product detail images (e.g. different angles for a t-shirt design, more screenshots for a template).
- Same processing pipeline as the cover image (Rule 35.6).
- Same 5MB per-file limit, same accepted types.

### 2.3 — Preview Video (optional, 1 per product)

- Primarily for the **AI Videos** category (the actual product preview), but available to every category — e.g. a Template product can have a short screen-recording demo, a Tutorial can have a preview clip.
- **Videos are NOT run through Rule 35.6's `processImage()` pipeline** — that pipeline is Sharp-based and image-only. Videos are validated and uploaded as-is (no in-house transcoding in this phase — see Section 7 for a noted future option).
- Max upload size: 100MB. Accepted types: MP4 (`video/mp4`), WebM (`video/webm`), QuickTime/MOV (`video/quicktime`).
- **Assumption (flagging since not specified):** 100MB is set as a reasonable default matching typical short preview-clip lengths (30–90 seconds at reasonable bitrate) without needing adaptive-bitrate infrastructure — adjust if actual AI-video preview lengths run longer.

---

## 3. R2 STORAGE — FOLDER STRUCTURE

Extends Rule 35.8's existing `products/` folder with per-product subfolders and a type split:

```
bucket/
└── products/
    └── <productId>/
        ├── cover.webp              ← cover image, always this exact filename (overwritten on replace)
        ├── gallery/
        │   ├── <uuid>.webp
        │   └── <uuid>.webp
        └── video/
            └── <uuid>.<ext>        ← original extension kept (mp4/webm/mov), not converted
```

**Rules:**
- All image filenames are still randomized (`randomUUID()`, Rule 35.6) EXCEPT the cover image, which uses a fixed `cover.webp` name so replacing it is a simple overwrite rather than an orphaned-file cleanup (still call `deleteFromR2()` on the old key first if the extension somehow changes).
- Gallery and video files keep randomized names — multiple files per product need unique keys.
- Deleting a product deletes its entire `products/<productId>/` prefix from R2 — never leave orphaned media behind (extends Rule 35.6's "always delete replaced files" rule to full-product deletion).

---

## 4. UPLOAD FORM — CREATE/EDIT PRODUCT

Replaces the current single "Image/Thumbnail" field in both admin spec Section 3.2.2 and super-admin spec Section 3.10's Create/Edit Form with a **Media** section:

- **Cover Image** — single file picker, required, shows current image with a "Replace" option when editing
- **Gallery Images** — multi-file picker (drag-and-drop supported per Rule 17's design standards), shows uploaded thumbnails in a reorderable strip, "Add More" up to 8 total, per-image delete (×) button
- **Preview Video** — single file picker, optional, shows a video player preview once uploaded, "Replace" or "Remove" options
- Upload progress bar per file (Rule 25's loading-state pattern — never a blank wait, especially relevant for the larger video files)
- Client-side validation before upload attempt: file type and size checked immediately, rejected with an inline error (Rule 34.1 message pattern) BEFORE hitting the network — never let a 95MB-over-limit video start uploading only to fail server-side

---

## 5. API ENDPOINTS

### POST /api/upload

Extends the existing Rule 35.6 endpoint with a `mediaType` field so the backend knows whether to run the image pipeline or skip straight to R2.

**Request (multipart/form-data):**

```
file: <binary>
folder: "products/<productId>/gallery"   // or "products/<productId>/video", or omitted for cover (fixed path)
mediaType: "image" | "video"
```

**Server logic:**

```javascript
/**
 * Extends the existing upload route (Rule 35.6). mediaType determines
 * whether the file goes through Sharp processing (images) or is
 * validated and uploaded as-is (video — Sharp can't process video).
 */
if (mediaType === "image") {
  // existing pipeline: validate type/size (5MB) → processImage() → uploadToR2()
} else if (mediaType === "video") {
  // validate type (mp4/webm/mov) and size (100MB) → uploadToR2() directly, no processing
}
```

**Response:** same shape as the existing Rule 35.6 endpoint — `{ success, data: { url, key }, message }`.

### DELETE /api/products/[productId]

Extended to delete the entire `products/<productId>/` R2 prefix (Section 3), not just the single cover image key that exists today.

---

## 6. DATA MODEL

Extends the `Product` model (referenced in admin spec Section 3.2.2, `products` table):

```prisma
model Product {
  // ...existing fields (id, name, category, price, description, status, etc.)

  coverImageUrl   String?              // R2 public URL, products/<id>/cover.webp
  coverImageKey   String?              // R2 key, needed for deletion/replacement

  galleryImages   ProductGalleryImage[]

  previewVideoUrl String?              // R2 public URL, products/<id>/video/<uuid>.<ext>
  previewVideoKey String?
}

model ProductGalleryImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  key       String
  sortOrder Int     @default(0)        // matches the reorderable strip in Section 4

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

---

## 7. RULES & REQUIREMENTS

- Every image or video uploaded for a product, by either an admin or a super-admin, goes to Cloudflare R2 — never Google Drive (Rule 35.7's document-only assignment stays unchanged), never any other storage.
- Videos are never processed through the image pipeline — attempting to run `processImage()`/Sharp on a video file will fail; the upload route must branch on `mediaType` before choosing a pipeline (Section 5).
- Same validation discipline as Rule 35.6: file type and size checked server-side regardless of client-side checks, random filenames (except the fixed `cover.webp`), old files deleted from R2 before a replacement is written.
- **Future option, not in this phase:** if AI Video previews need adaptive-bitrate streaming or automatic thumbnail-frame extraction later, that would mean introducing Cloudflare Stream (or similar) alongside R2 — noted here so it isn't forgotten, but out of scope until actually needed.

---

## 8. TOAST NOTIFICATIONS (Rule 22)

| Action | Type | Message |
|---|---|---|
| Cover image uploaded | success | `✓ Cover image uploaded.` |
| Gallery image added | success | `✓ Image added to gallery.` |
| Gallery image removed | success | `✓ Image removed.` |
| Video uploaded | success | `✓ Preview video uploaded.` |
| File too large | error | `✕ File is too large. Images max 5MB, videos max 100MB.` |
| Unsupported file type | error | `✕ Unsupported file type. Please use JPEG, PNG, WebP, or MP4/WebM/MOV.` |

---

## 9. TESTING & VERIFICATION CHECKLIST

- [ ] Cover image upload runs through the Sharp pipeline (resized, converted to WebP) — confirmed by checking the stored file's format
- [ ] Video upload does NOT run through the Sharp pipeline — original extension preserved in R2
- [ ] Gallery supports up to 8 images, rejects a 9th with a clear message
- [ ] Replacing the cover image deletes the old R2 object before/while writing the new one
- [ ] Deleting a product removes its entire `products/<productId>/` prefix from R2, not just the cover image
- [ ] Client-side validation rejects an oversized/wrong-type file before any network request is made
- [ ] Both `/admin/products` and `/superAdmin/products` use the identical Media upload component — no divergent behavior between account types
- [ ] All tests pass with `npx tsc --noEmit`

---

## 10. CHANGE LOG

| Date       | Change                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-04 | Initial specification created — expands the single "Image/Thumbnail, max 5MB" field into Cover Image + up to 8 Gallery Images + 1 Preview Video, all stored in Cloudflare R2 per Rule 35.6, split by `products/<productId>/{cover.webp, gallery/, video/}`. Videos bypass the Sharp image pipeline and upload as-is after validation. Cross-referenced into `admin_account_specification.md` Section 3.2.2 and `super_admin_account_specification.md` Section 3.10. |

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-04  
**Status:** Specification Complete — not yet built (current product form only has a single 5MB image field, no gallery or video support yet)
