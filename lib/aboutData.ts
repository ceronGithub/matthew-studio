/**
 * FILE: lib/aboutData.ts
 * PURPOSE:
 * Static content for the /about page — mission statement and the
 * "how we work" value pillars. Same static-data pattern as
 * lib/featuresData.ts and lib/categoryShowcaseData.ts, pending real
 * founder/team bios and verified company history (none of that exists
 * in the codebase yet, so this file deliberately stays generic rather
 * than inventing names, dates, or a founding story).
 *
 * DATA FLOW:
 * Imported by app/(public)/about/page.tsx. No fetch — local array.
 */

export interface AboutValue {
  title: string;
  description: string;
}

export const ABOUT_VALUES: AboutValue[] = [
  {
    title: "Built to launch fast",
    description:
      "Every product across every category is designed to go from purchase to live use in hours, not months — no scoping calls required to get started.",
  },
  {
    title: "One catalog, one standard",
    description:
      "Templates, apparel, AI video, file tools, tutorials, and game assets are all held to the same bar for quality and support, whatever category you're buying from.",
  },
  {
    title: "No lock-in surprises",
    description:
      "Pricing and what's included are shown up front on every product and tier — see /pricing and /features for the specifics before you buy.",
  },
];
