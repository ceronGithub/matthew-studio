/**
 * FILE: app/(public)/templates/page.tsx
 * ROLE: Public — Templates category page, served at "/templates".
 *
 * PURPOSE:
 * Standalone page for the Templates category, per improvement_1.md
 * Section 4's missing-pages list. Renders the existing
 * TemplatesSection component (comparison table, benefits, "why us",
 * demo video, product cards, CTA) as the full page body — that
 * section is already a complete, self-contained pitch for this
 * category, built for the homepage but equally valid standalone.
 * Reusing it here (rather than rebuilding the same content) keeps
 * the homepage and this page from drifting out of sync.
 *
 * DATA FLOW:
 * No data fetching in this file — TemplatesSection reads
 * PRICING_TIERS, PRODUCTS, and templatesSectionData.ts itself. Every
 * class TemplatesSection uses (categorySection, sectionContainer,
 * comparisonTable, whyUsGrid, productCardsGrid, etc.) lives in
 * app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import TemplatesSection from "@/components/home/TemplatesSection";

export const metadata: Metadata = {
  title: "Templates | Matthew Studio",
  description:
    "Production-ready booking website templates, three ways to own one: managed, self-hosted, or custom-built. Every template ships with a real booking engine.",
  openGraph: {
    title: "Templates | Matthew Studio",
    description:
      "Production-ready booking website templates, three ways to own one: managed, self-hosted, or custom-built. Every template ships with a real booking engine.",
    images: ["/og-home.png"],
  },
};

export default function TemplatesPage() {
  return <TemplatesSection />;
}
