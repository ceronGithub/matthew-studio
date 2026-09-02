Drop the real QuickWins showcase files here, using these exact
filenames (referenced by lib/mediaShowcaseData.ts — QUICK_WINS_MEDIA_ITEMS):

  templates.jpg
  tshirts.jpg
  ai-videos.mp4
  file-tools.jpg
  tutorials.jpg
  game-characters.jpg

Format notes:
  - Images: 16:9 aspect ratio works best (matches .quickWinsMediaItem).
    JPEG or WebP, ideally under 300KB each.
  - Video: short loop (3-8s), muted-friendly, under 5MB. MP4 (H.264).

Once added, no code changes are needed — QuickWins.tsx already points
at these paths.
