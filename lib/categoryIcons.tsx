/**
 * FILE: lib/categoryIcons.tsx
 * PURPOSE:
 * Single shared map from a product/category iconName to its Lucide
 * icon component. CategoryShowcase.tsx and FeaturedProducts.tsx each
 * already define their own copy of this map inline — this file exists
 * so every NEW component (ProductCard, and the Phase 2 category
 * sections) reads from one source instead of adding a fourth copy.
 * Not a breaking change: the two existing inline maps are left as-is.
 *
 * DATA FLOW:
 * Keyed by the same iconName union already used in
 * CategoryShowcaseItem and Product (lib/productsData.ts).
 */
import {
  LayoutTemplate,
  Shirt,
  Clapperboard,
  Wrench,
  BookOpen,
  Box,
  type LucideIcon,
} from "lucide-react";
import type { CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

export const CATEGORY_ICONS: Record<CategoryShowcaseItem["iconName"], LucideIcon> = {
  "layout-template": LayoutTemplate,
  shirt: Shirt,
  clapperboard: Clapperboard,
  wrench: Wrench,
  "book-open": BookOpen,
  box: Box,
};
