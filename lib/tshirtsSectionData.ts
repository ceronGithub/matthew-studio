/**
 * FILE: lib/tshirtsSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's T-Shirts section
 * (IMPROVEMENTS.md Section 4B): the Design Gallery Carousel slides
 * and "The Story" callout quote. Product cards reuse the "tshirts"
 * category items already in lib/productsData.ts — this file only
 * holds the section's own gallery/story copy.
 *
 * DATA FLOW:
 * Imported by components/home/TShirtsSection.tsx only. No real
 * design photos exist yet, so each slide uses a tinted gradient
 * placeholder (Rule 27 — swap for next/image once photos exist).
 */

export interface DesignGallerySlide {
  id: string;
  designName: string;
  tagline: string;
}

export const TSHIRT_DESIGN_GALLERY: DesignGallerySlide[] = [
  { id: "creator-drop", designName: "Creator Drop", tagline: "Heavyweight cotton, screen-printed, one drop only." },
  { id: "minimalist-logo", designName: "Minimalist Logo", tagline: "One color, six sizes, made to layer." },
  { id: "oversized-graphic", designName: "Oversized Graphic", tagline: "Streetwear cut, full back print." },
];

export const TSHIRT_STORY = {
  quote: "We design for creators first — every print starts as something we'd actually wear, not a template stretched over a blank shirt.",
  attribution: "Matthew Studio, Apparel Team",
};
