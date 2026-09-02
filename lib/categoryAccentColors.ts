/**
 * FILE: lib/categoryAccentColors.ts
 * PURPOSE:
 * One accent color per marketplace category — the same 6 hues from
 * the approved homepage mockup's category chip row. Single source of
 * truth so QuickWins' chips, CategoryShowcase's card accents, and the
 * rotating media showcases (lib/mediaShowcaseData.ts) never drift out
 * of sync with each other.
 *
 * DATA FLOW:
 * Keyed by the same slugs as lib/categoryShowcaseData.ts — import and
 * look up by category.slug wherever a category needs its color.
 */

export const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  templates: "#2fd480",
  tshirts: "#ff8a5c",
  "ai-videos": "#7f9cf5",
  "file-tools": "#e8c96a",
  tutorials: "#c988e0",
  "game-characters": "#6fd6d6",
};
