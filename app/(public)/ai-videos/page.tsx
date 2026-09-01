/**
 * FILE: app/(public)/ai-videos/page.tsx
 * ROLE: Public — AI Videos category page, served at "/ai-videos".
 *
 * PURPOSE:
 * Standalone page for the AI Videos category, per improvement_1.md
 * Section 4's missing-pages list. Renders the existing
 * AIVideosSection component (sample video carousel, custom-order
 * callout, product cards, CTA) as the full page body — see
 * /templates/page.tsx for why reusing the existing section (vs.
 * rebuilding it) is the right call here.
 *
 * DATA FLOW:
 * No data fetching in this file — AIVideosSection reads PRODUCTS and
 * aiVideosSectionData.ts itself. Every class it uses lives in
 * app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import AIVideosSection from "@/components/home/AIVideosSection";

export const metadata: Metadata = {
  title: "AI Videos | Matthew Studio",
  description:
    "Ready-made AI video packs for product teasers, explainers, and social shorts — or a custom video built around your brief.",
  openGraph: {
    title: "AI Videos | Matthew Studio",
    description:
      "Ready-made AI video packs for product teasers, explainers, and social shorts — or a custom video built around your brief.",
    images: ["/og-home.png"],
  },
};

export default function AIVideosPage() {
  return <AIVideosSection />;
}
