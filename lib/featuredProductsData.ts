/**
 * FILE: lib/featuredProductsData.ts
 * PURPOSE:
 * Static content for the homepage's Featured Products Carousel —
 * "Bestsellers This Month". Pulls one or two items from different
 * marketplace categories so the strip isn't dominated by a single
 * category. Same static-data pattern as lib/categoryShowcaseData.ts,
 * pending a superAdmin-managed products table.
 *
 * DATA FLOW:
 * Imported by components/home/FeaturedProducts.tsx. No real product
 * images exist yet, so cards render a category-tinted icon placeholder
 * instead of a photo — swap for next/image once real thumbnails ship.
 */

import type { CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

export interface FeaturedProduct {
  id: string;
  name: string;
  categorySlug: string;
  categoryLabel: string;
  iconName: CategoryShowcaseItem["iconName"];
  rating: { average: number; count: number };
  price: string;
}

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: "resort-booking-modern",
    name: "Resort Booking — Modern",
    categorySlug: "templates",
    categoryLabel: "Templates",
    iconName: "layout-template",
    rating: { average: 4.8, count: 124 },
    price: "From ₱10,000/mo",
  },
  {
    id: "creator-drop-tee",
    name: "Creator Drop Tee",
    categorySlug: "tshirts",
    categoryLabel: "T-Shirts",
    iconName: "shirt",
    rating: { average: 4.6, count: 58 },
    price: "₱599",
  },
  {
    id: "ai-product-teaser",
    name: "AI Product Teaser Pack",
    categorySlug: "ai-videos",
    categoryLabel: "AI Videos",
    iconName: "clapperboard",
    rating: { average: 4.7, count: 41 },
    price: "₱2,500",
  },
  {
    id: "bulk-file-converter",
    name: "Bulk File Converter",
    categorySlug: "file-tools",
    categoryLabel: "File Tools",
    iconName: "wrench",
    rating: { average: 4.9, count: 96 },
    price: "₱399",
  },
  {
    id: "nextjs-from-zero",
    name: "Next.js From Zero",
    categorySlug: "tutorials",
    categoryLabel: "Tutorials",
    iconName: "book-open",
    rating: { average: 4.8, count: 210 },
    price: "₱1,499",
  },
  {
    id: "fantasy-hero-rig",
    name: "Fantasy Hero Rig",
    categorySlug: "game-characters",
    categoryLabel: "Game Characters",
    iconName: "box",
    rating: { average: 4.7, count: 33 },
    price: "₱1,800",
  },
];
