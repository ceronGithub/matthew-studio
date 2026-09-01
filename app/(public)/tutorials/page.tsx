/**
 * FILE: app/(public)/tutorials/page.tsx
 * ROLE: Public — Tutorials category page, served at "/tutorials".
 *
 * PURPOSE:
 * Standalone page for the Tutorials category, per improvement_1.md
 * Section 4's missing-pages list. Renders the existing
 * TutorialsSection component ("who's this for?" persona callout,
 * product cards grouped by level, CTA) as the full page body — see
 * /templates/page.tsx for why reusing the existing section (vs.
 * rebuilding it) is the right call here.
 *
 * DATA FLOW:
 * No data fetching in this file — TutorialsSection reads PRODUCTS and
 * tutorialsSectionData.ts itself. Every class it uses lives in
 * app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import TutorialsSection from "@/components/home/TutorialsSection";

export const metadata: Metadata = {
  title: "Tutorials | Matthew Studio",
  description:
    "Learn from real projects, grouped by level — from Next.js fundamentals to Figma-to-code workflows and database crash courses.",
  openGraph: {
    title: "Tutorials | Matthew Studio",
    description:
      "Learn from real projects, grouped by level — from Next.js fundamentals to Figma-to-code workflows and database crash courses.",
    images: ["/og-home.png"],
  },
};

export default function TutorialsPage() {
  return <TutorialsSection />;
}
