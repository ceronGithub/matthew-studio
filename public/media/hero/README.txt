Drop the real Hero showcase files here, using these exact filenames
(referenced by lib/mediaShowcaseData.ts — HERO_MEDIA_ITEMS):

  templates.jpg          - Resort Booking template screenshot/photo
  tshirts.jpg            - Creator merch product photo
  ai-video-teaser.mp4    - AI product teaser video clip

Format notes:
  - Images: 16:10 aspect ratio works best (matches .heroMediaCardThumb).
    JPEG or WebP, ideally under 300KB each.
  - Video: short loop (3-8s), muted-friendly, under 5MB. MP4 (H.264).

Once added, no code changes are needed — HeroSection.tsx already
points at these paths.
