/**
 * FILE: lib/categoryShowcaseData.ts
 * PURPOSE:
 * Static content for the homepage's Category Showcase Grid — the 6
 * marketplace categories, their starting price, and short blurb.
 * Same static-data pattern as lib/featuresData.ts and lib/pricingData.ts,
 * pending a superAdmin-managed products table.
 *
 * DATA FLOW:
 * Imported by components/home/CategoryShowcase.tsx and rendered as a
 * responsive card grid (3 cols desktop, 2 tablet, 1 mobile).
 */

export interface CategoryShowcaseItem {
  slug: string;
  name: string;
  description: string;
  startingPrice: string;
  badge?: string;
  iconName: "layout-template" | "shirt" | "clapperboard" | "wrench" | "book-open" | "box";
}

export const CATEGORY_SHOWCASE: CategoryShowcaseItem[] = [
  {
    slug: "templates",
    name: "Templates",
    description: "Production-ready website templates across 3 design variants.",
    startingPrice: "From ₱10k/mo",
    badge: "3 variants",
    iconName: "layout-template",
  },
  {
    slug: "tshirts",
    name: "T-Shirts",
    description: "Custom-print apparel with size and color options.",
    startingPrice: "From ₱499",
    iconName: "shirt",
  },
  {
    slug: "ai-videos",
    name: "AI Videos",
    description: "AI-generated video content, ready to publish or repurpose.",
    startingPrice: "From ₱2,500",
    iconName: "clapperboard",
  },
  {
    slug: "file-tools",
    name: "File Tools",
    description: "Utilities for converting, compressing, and cleaning up files.",
    startingPrice: "From ₱299",
    iconName: "wrench",
  },
  {
    slug: "tutorials",
    name: "Tutorials",
    description: "Structured courses to learn a skill from start to finish.",
    startingPrice: "From ₱999",
    iconName: "book-open",
  },
  {
    slug: "game-characters",
    name: "Game Characters",
    description: "3D and 2D character assets, rigged and ready to import.",
    startingPrice: "From ₱1,500",
    iconName: "box",
  },
];
