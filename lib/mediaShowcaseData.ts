/**
 * FILE: lib/mediaShowcaseData.ts
 * PURPOSE:
 * Shared shape + content for the two rotating media showcases on the
 * homepage: HeroSection's floating product card, and QuickWins'
 * category media strip. Each item carries an accentColor — while it's
 * the active item, the section's ambient background glow tints to
 * that color (see .heroAmbientGlow / .quickWinsAmbientGlow in
 * app/styles/home.css), driven by hooks/useMediaCarousel.ts.
 *
 * ASSETS — ACTION NEEDED:
 * The files referenced below are NOT included in this delivery. Drop
 * the real photos/videos at these exact paths, using these exact
 * filenames, and they'll appear automatically — no code changes:
 *   public/media/hero/templates.jpg
 *   public/media/hero/tshirts.jpg
 *   public/media/hero/ai-video-teaser.mp4
 *   public/media/quickwins/templates.jpg
 *   public/media/quickwins/tshirts.jpg
 *   public/media/quickwins/ai-videos.mp4
 *   public/media/quickwins/file-tools.jpg
 *   public/media/quickwins/tutorials.jpg
 *   public/media/quickwins/game-characters.jpg
 * See the README.txt in each of those two folders for format notes
 * (aspect ratio, max file size). Until the real files are added,
 * Next.js will 404 on the <img>/<video> request — expected, not a bug.
 *
 * DATA FLOW:
 * Imported by components/home/HeroSection.tsx and
 * components/home/QuickWins.tsx.
 */

export interface MediaShowcaseItem {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  caption: string;
  subcaption?: string;
  accentColor: string;
  // iconName — used by components/shared/MediaPreviewPlaceholder.tsx as
  // the centered fallback graphic whenever `src` 404s (see ASSETS —
  // ACTION NEEDED note above). Same iconName union as
  // CategoryShowcaseItem so both sections' fallbacks stay visually
  // consistent with the category grid.
  iconName: "layout-template" | "shirt" | "clapperboard" | "wrench" | "book-open" | "box";
}

// Mirrors HERO_PREVIEW_CATEGORIES' old order (Templates → T-Shirts →
// AI Videos) so the categories featured in the hero stay the same
// ones as before — only the presentation (real rotating media
// instead of an icon grid) has changed.
export const HERO_MEDIA_ITEMS: MediaShowcaseItem[] = [
  {
    id: "hero-templates",
    type: "image",
    src: "/media/hero/templates.jpg",
    alt: "Resort booking website template preview",
    caption: "Resort Booking — Modern",
    subcaption: "Next.js · booking flow included",
    accentColor: "#2fd480",
    iconName: "layout-template",
  },
  {
    id: "hero-tshirts",
    type: "image",
    src: "/media/hero/tshirts.jpg",
    alt: "Custom printed t-shirt product photo",
    caption: "Creator Merch Drop",
    subcaption: "Custom print · size & color options",
    accentColor: "#ff8a5c",
    iconName: "shirt",
  },
  {
    id: "hero-ai-video",
    type: "video",
    src: "/media/hero/ai-video-teaser.mp4",
    alt: "AI-generated product teaser video preview",
    caption: "AI Product Teaser Pack",
    subcaption: "Ready to publish or repurpose",
    accentColor: "#7f9cf5",
    iconName: "clapperboard",
  },
];

// One item per marketplace category, same order and colors as
// lib/categoryAccentColors.ts / lib/categoryShowcaseData.ts.
export const QUICK_WINS_MEDIA_ITEMS: MediaShowcaseItem[] = [
  {
    id: "quickwins-templates",
    type: "image",
    src: "/media/quickwins/templates.jpg",
    alt: "Templates category preview",
    caption: "Templates",
    accentColor: "#2fd480",
    iconName: "layout-template",
  },
  {
    id: "quickwins-tshirts",
    type: "image",
    src: "/media/quickwins/tshirts.jpg",
    alt: "T-Shirts category preview",
    caption: "T-Shirts",
    accentColor: "#ff8a5c",
    iconName: "shirt",
  },
  {
    id: "quickwins-ai-videos",
    type: "video",
    src: "/media/quickwins/ai-videos.mp4",
    alt: "AI Videos category preview",
    caption: "AI Videos",
    accentColor: "#7f9cf5",
    iconName: "clapperboard",
  },
  {
    id: "quickwins-file-tools",
    type: "image",
    src: "/media/quickwins/file-tools.jpg",
    alt: "File Tools category preview",
    caption: "File Tools",
    accentColor: "#e8c96a",
    iconName: "wrench",
  },
  {
    id: "quickwins-tutorials",
    type: "image",
    src: "/media/quickwins/tutorials.jpg",
    alt: "Tutorials category preview",
    caption: "Tutorials",
    accentColor: "#c988e0",
    iconName: "book-open",
  },
  {
    id: "quickwins-game-characters",
    type: "image",
    src: "/media/quickwins/game-characters.jpg",
    alt: "Game Characters category preview",
    caption: "Game Characters",
    accentColor: "#6fd6d6",
    iconName: "box",
  },
];
