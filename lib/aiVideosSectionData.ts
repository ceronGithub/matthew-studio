/**
 * FILE: lib/aiVideosSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's AI Videos section
 * (IMPROVEMENTS.md Section 4C): the sample video carousel items and
 * the "Need custom videos?" callout copy. Product cards reuse the
 * "ai-videos" category items already in lib/productsData.ts.
 *
 * DATA FLOW:
 * Imported by components/home/AIVideosSection.tsx only. No real
 * sample videos exist yet — src/poster are placeholder paths,
 * matching the same not-yet-real-asset pattern already used by
 * lib/templatesSectionData.ts's demo video.
 */

export interface AIVideoSample {
  id: string;
  title: string;
  src: string;
  poster?: string;
  /** WebVTT captions file path — see VideoCarouselItem's captionsSrc doc. */
  captionsSrc?: string;
}

export const AI_VIDEO_SAMPLES: AIVideoSample[] = [
  {
    id: "product-teaser-sample",
    title: "Product teaser — 30s",
    src: "/videos/ai-product-teaser-sample.mp4",
    poster: "/images/ai-product-teaser-poster.jpg",
    captionsSrc: "/videos/captions/ai-product-teaser-sample.vtt",
  },
  {
    id: "explainer-sample",
    title: "Explainer with auto voiceover — 45s",
    src: "/videos/ai-explainer-sample.mp4",
    poster: "/images/ai-explainer-poster.jpg",
    captionsSrc: "/videos/captions/ai-explainer-sample.vtt",
  },
  {
    id: "social-short-sample",
    title: "Vertical social short — 20s",
    src: "/videos/ai-social-short-sample.mp4",
    poster: "/images/ai-social-short-poster.jpg",
    captionsSrc: "/videos/captions/ai-social-short-sample.vtt",
  },
];

export const AI_VIDEO_CUSTOM_CALLOUT = {
  headline: "Need something custom?",
  body: "If none of the packs fit your product, we'll script, generate, and edit a one-off video around your brief.",
  ctaLabel: "Talk to Us",
  ctaHref: "/contact?tier=custom-video",
};
