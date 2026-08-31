/**
 * FILE: lib/productsData.ts
 * PURPOSE:
 * Unified product schema and static catalog spanning all 6 marketplace
 * categories (Templates, T-Shirts, AI Videos, File Tools, Tutorials,
 * Game Characters), per Section 5 of MARKETPLACE_IMPROVEMENTS.md. This
 * is the single source of truth for the upcoming /products master
 * grid, the 6 category pages, and individual product detail pages —
 * replacing the narrower categoryShowcaseData.ts (6 category summary
 * cards) and featuredProductsData.ts (homepage bestsellers strip),
 * which stay as their own separate homepage-only files for now (see
 * overviewProject.txt) rather than being merged into this one.
 *
 * PRICING SHAPE:
 * `price.startingPrice` is the one field every product has — a plain
 * peso number used for sorting and price-range filtering across every
 * category. The Managed/Self-Hosted/Custom tier breakdown from the
 * plan's Section 5 example only applies to Templates (that's the
 * product's actual 3-tier pricing model, same as lib/pricingData.ts);
 * every other category is a flat one-time or subscription price, so
 * those extra fields are omitted rather than left as unused zeros.
 *
 * DATA FLOW:
 * No database yet — replace with a superAdmin-managed `products` table
 * once the admin dashboard is built. No real product photos exist
 * yet either, so `iconName` drives a category-tinted icon placeholder
 * (same pattern as FeaturedProducts.tsx) — swap for a real `image`
 * field once photos are available (Rule 27).
 */

import type { CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

export type ProductCategorySlug =
  | "templates"
  | "tshirts"
  | "ai-videos"
  | "file-tools"
  | "tutorials"
  | "game-characters";

export type ProductBadge = "bestseller" | "new" | "limited" | null;

export interface ProductVariant {
  name: string;
  description: string;
  designs?: string[];
  pricing?: { managed: number; selfHosted: number };
}

export interface Product {
  id: string;
  slug: string;
  category: ProductCategorySlug;
  categoryLabel: string;
  name: string;
  description: string;
  iconName: CategoryShowcaseItem["iconName"];
  price: {
    /** Plain peso number — the universal sort/filter value for every category. */
    startingPrice: number;
    /** Templates only — see PRICING SHAPE note above. */
    managed?: { monthly: number; annual: number };
    selfHosted?: number;
    custom?: number;
  };
  rating: { average: number; count: number };
  badge: ProductBadge;
  /** ISO date — drives the "Newest" sort option. */
  dateAdded: string;
  /** Drives the "Trending" sort option; not shown to visitors directly. */
  trendingScore: number;
  /** Templates only. */
  variants?: ProductVariant[];
}

export const PRODUCTS: Product[] = [
  // ---------------------------------------------------------------
  // TEMPLATES
  // ---------------------------------------------------------------
  {
    id: "resort-booking-modern",
    slug: "resort-booking-modern",
    category: "templates",
    categoryLabel: "Templates",
    name: "Resort Booking — Modern",
    description: "Multi-room booking, promos, and an admin dashboard, live in 48 hours.",
    iconName: "layout-template",
    price: { startingPrice: 10000, managed: { monthly: 10000, annual: 108000 }, selfHosted: 250000, custom: 500000 },
    rating: { average: 4.8, count: 124 },
    badge: "bestseller",
    dateAdded: "2026-06-12",
    trendingScore: 98,
    variants: [
      { name: "Static", description: "Fixed layout, fastest to launch.", designs: ["Design A", "Design B", "Design C"], pricing: { managed: 8000, selfHosted: 200000 } },
      { name: "Dynamic", description: "CMS-driven content, editable without code.", designs: ["Design A", "Design B", "Design C"], pricing: { managed: 10000, selfHosted: 250000 } },
      { name: "Modern", description: "Full animation system, the flagship look.", designs: ["Design A", "Design B", "Design C"], pricing: { managed: 13000, selfHosted: 300000 } },
    ],
  },
  {
    id: "clinic-scheduler",
    slug: "clinic-scheduler",
    category: "templates",
    categoryLabel: "Templates",
    name: "Clinic Appointment Scheduler",
    description: "Patient booking, doctor calendars, and SMS reminders out of the box.",
    iconName: "layout-template",
    price: { startingPrice: 12000, managed: { monthly: 12000, annual: 129600 }, selfHosted: 280000, custom: 550000 },
    rating: { average: 4.6, count: 41 },
    badge: "new",
    dateAdded: "2026-08-20",
    trendingScore: 61,
  },
  {
    id: "restaurant-ordering",
    slug: "restaurant-ordering",
    category: "templates",
    categoryLabel: "Templates",
    name: "Restaurant Online Ordering",
    description: "Menu builder, delivery zones, and a kitchen order dashboard.",
    iconName: "layout-template",
    price: { startingPrice: 9000, managed: { monthly: 9000, annual: 97200 }, selfHosted: 220000, custom: 450000 },
    rating: { average: 4.5, count: 67 },
    badge: null,
    dateAdded: "2026-05-02",
    trendingScore: 54,
  },

  // ---------------------------------------------------------------
  // T-SHIRTS
  // ---------------------------------------------------------------
  {
    id: "creator-drop-tee",
    slug: "creator-drop-tee",
    category: "tshirts",
    categoryLabel: "T-Shirts",
    name: "Creator Drop Tee",
    description: "Heavyweight cotton, screen-printed, limited seasonal drop.",
    iconName: "shirt",
    price: { startingPrice: 599 },
    rating: { average: 4.6, count: 58 },
    badge: "bestseller",
    dateAdded: "2026-07-01",
    trendingScore: 82,
  },
  {
    id: "minimalist-logo-tee",
    slug: "minimalist-logo-tee",
    category: "tshirts",
    categoryLabel: "T-Shirts",
    name: "Minimalist Logo Tee",
    description: "Single-color chest print, six sizes, four colorways.",
    iconName: "shirt",
    price: { startingPrice: 499 },
    rating: { average: 4.4, count: 33 },
    badge: null,
    dateAdded: "2026-04-18",
    trendingScore: 40,
  },
  {
    id: "oversized-graphic-tee",
    slug: "oversized-graphic-tee",
    category: "tshirts",
    categoryLabel: "T-Shirts",
    name: "Oversized Graphic Tee",
    description: "Streetwear cut, full back print, limited stock per size.",
    iconName: "shirt",
    price: { startingPrice: 699 },
    rating: { average: 4.7, count: 19 },
    badge: "limited",
    dateAdded: "2026-08-25",
    trendingScore: 71,
  },

  // ---------------------------------------------------------------
  // AI VIDEOS
  // ---------------------------------------------------------------
  {
    id: "ai-product-teaser",
    slug: "ai-product-teaser",
    category: "ai-videos",
    categoryLabel: "AI Videos",
    name: "AI Product Teaser Pack",
    description: "10 short-form product teaser templates, ready to swap in your footage.",
    iconName: "clapperboard",
    price: { startingPrice: 2500 },
    rating: { average: 4.7, count: 41 },
    badge: "bestseller",
    dateAdded: "2026-06-30",
    trendingScore: 77,
  },
  {
    id: "ai-explainer-pack",
    slug: "ai-explainer-pack",
    category: "ai-videos",
    categoryLabel: "AI Videos",
    name: "AI Explainer Video Pack",
    description: "Script-to-video explainer templates with auto voiceover and captions.",
    iconName: "clapperboard",
    price: { startingPrice: 3200 },
    rating: { average: 4.5, count: 22 },
    badge: "new",
    dateAdded: "2026-08-14",
    trendingScore: 58,
  },
  {
    id: "ai-social-shorts",
    slug: "ai-social-shorts",
    category: "ai-videos",
    categoryLabel: "AI Videos",
    name: "AI Social Shorts Bundle",
    description: "Vertical short-form templates tuned for Reels/TikTok/Shorts.",
    iconName: "clapperboard",
    price: { startingPrice: 1800 },
    rating: { average: 4.6, count: 35 },
    badge: null,
    dateAdded: "2026-03-11",
    trendingScore: 49,
  },

  // ---------------------------------------------------------------
  // FILE TOOLS
  // ---------------------------------------------------------------
  {
    id: "bulk-file-converter",
    slug: "bulk-file-converter",
    category: "file-tools",
    categoryLabel: "File Tools",
    name: "Bulk File Converter",
    description: "Batch-convert images, docs, and audio between formats in one pass.",
    iconName: "wrench",
    price: { startingPrice: 399 },
    rating: { average: 4.9, count: 96 },
    badge: "bestseller",
    dateAdded: "2026-05-19",
    trendingScore: 91,
  },
  {
    id: "pdf-compressor-pro",
    slug: "pdf-compressor-pro",
    category: "file-tools",
    categoryLabel: "File Tools",
    name: "PDF Compressor Pro",
    description: "Shrink large PDFs without visible quality loss, batch mode included.",
    iconName: "wrench",
    price: { startingPrice: 299 },
    rating: { average: 4.7, count: 54 },
    badge: null,
    dateAdded: "2026-02-27",
    trendingScore: 45,
  },
  {
    id: "image-background-remover",
    slug: "image-background-remover",
    category: "file-tools",
    categoryLabel: "File Tools",
    name: "Image Background Remover",
    description: "One-click background removal for product photos, batch export.",
    iconName: "wrench",
    price: { startingPrice: 349 },
    rating: { average: 4.8, count: 71 },
    badge: "new",
    dateAdded: "2026-08-22",
    trendingScore: 66,
  },

  // ---------------------------------------------------------------
  // TUTORIALS
  // ---------------------------------------------------------------
  {
    id: "nextjs-from-zero",
    slug: "nextjs-from-zero",
    category: "tutorials",
    categoryLabel: "Tutorials",
    name: "Next.js From Zero",
    description: "Full course: App Router, Server Components, and deployment.",
    iconName: "book-open",
    price: { startingPrice: 1499 },
    rating: { average: 4.8, count: 210 },
    badge: "bestseller",
    dateAdded: "2026-01-15",
    trendingScore: 95,
  },
  {
    id: "figma-to-code",
    slug: "figma-to-code",
    category: "tutorials",
    categoryLabel: "Tutorials",
    name: "Figma to Code Workflow",
    description: "Turn Figma designs into production React components efficiently.",
    iconName: "book-open",
    price: { startingPrice: 999 },
    rating: { average: 4.6, count: 88 },
    badge: null,
    dateAdded: "2026-04-09",
    trendingScore: 52,
  },
  {
    id: "prisma-postgres-crash-course",
    slug: "prisma-postgres-crash-course",
    category: "tutorials",
    categoryLabel: "Tutorials",
    name: "Prisma + Postgres Crash Course",
    description: "Schema design, migrations, and query patterns for real apps.",
    iconName: "book-open",
    price: { startingPrice: 1199 },
    rating: { average: 4.7, count: 63 },
    badge: "new",
    dateAdded: "2026-08-18",
    trendingScore: 60,
  },

  // ---------------------------------------------------------------
  // GAME CHARACTERS
  // ---------------------------------------------------------------
  {
    id: "fantasy-hero-rig",
    slug: "fantasy-hero-rig",
    category: "game-characters",
    categoryLabel: "Game Characters",
    name: "Fantasy Hero Rig",
    description: "Fully rigged 3D character with idle/walk/attack animation sets.",
    iconName: "box",
    price: { startingPrice: 1800 },
    rating: { average: 4.7, count: 33 },
    badge: "bestseller",
    dateAdded: "2026-06-05",
    trendingScore: 73,
  },
  {
    id: "sci-fi-soldier-pack",
    slug: "sci-fi-soldier-pack",
    category: "game-characters",
    categoryLabel: "Game Characters",
    name: "Sci-Fi Soldier Pack",
    description: "4 modular soldier characters with swappable armor pieces.",
    iconName: "box",
    price: { startingPrice: 2200 },
    rating: { average: 4.5, count: 17 },
    badge: null,
    dateAdded: "2026-03-30",
    trendingScore: 38,
  },
  {
    id: "low-poly-creature-set",
    slug: "low-poly-creature-set",
    category: "game-characters",
    categoryLabel: "Game Characters",
    name: "Low-Poly Creature Set",
    description: "12 stylized low-poly creatures, optimized for mobile game engines.",
    iconName: "box",
    price: { startingPrice: 1500 },
    rating: { average: 4.6, count: 29 },
    badge: "limited",
    dateAdded: "2026-08-27",
    trendingScore: 68,
  },
];