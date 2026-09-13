# task-120 — UI: /superAdmin/media page

**Fulfills spec:** Section 9.3.
**taskPlan.md phase:** Phase 7 — CMS, Announcements, Media Library.
**Dependency:** task-119 (media API must exist).

## What this builds
`app/superAdmin/media/page.tsx` +
`components/media/MediaLibraryGrid.tsx` (client) — same Server/Client
split and loading/empty/error pattern (Rule 25) as the other
super-admin list pages.

- Grid of thumbnails (image objects render the image itself via
  `next/image`; non-image objects — e.g. PDFs in `documents/` — show
  a file-type icon instead, never a broken image).
- Filter by folder (Rule 35.8's five folders + "All").
- Search by filename (client-side filter on the current page's
  results — R2 has no native filename search, so this stays scoped
  to what's already loaded rather than pretending to search the
  whole bucket).
- "Copy URL" button per item — copies the public CDN URL to
  clipboard, toast confirms (Rule 22: `✓ URL copied to clipboard.`).
- Pagination via R2's continuation token (Next/Prev, not numbered
  pages, since R2 listing doesn't support jumping to an arbitrary
  page).
- Add a "Media Library" `QUICK_ACTIONS` card to the super-admin
  dashboard.

## Verification
1. Navigate to `/superAdmin/media`. Expected: grid of existing
   uploads, thumbnails render for images.
2. Filter by "products/". Expected: only product images shown.
3. Click "Copy URL" on an item. Expected: toast fires, pasting
   clipboard contents gives the correct public URL.
4. Dashboard: "Media Library" quick action card links correctly.
