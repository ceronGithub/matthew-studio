/**
 * FILE: app/(public)/tshirts/page.tsx
 * ROLE: Public — T-Shirts category page, served at "/tshirts".
 *
 * PURPOSE:
 * Standalone page for the T-Shirts category, per improvement_1.md
 * Section 4's missing-pages list. Renders the existing
 * TShirtsSection component (design gallery carousel, story callout,
 * product cards, CTA) as the full page body — see /templates/page.tsx
 * for why reusing the existing section (vs. rebuilding it) is the
 * right call here.
 *
 * DATA FLOW:
 * No data fetching in this file — TShirtsSection reads PRODUCTS and
 * tshirtsSectionData.ts itself. Every class it uses lives in
 * app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import TShirtsSection from "@/components/home/TShirtsSection";

export const metadata: Metadata = {
  title: "T-Shirts | Matthew Studio",
  description:
    "Limited-run t-shirt designs made for creators. Heavyweight cotton, screen-printed drops — browse the current designs.",
  openGraph: {
    title: "T-Shirts | Matthew Studio",
    description:
      "Limited-run t-shirt designs made for creators. Heavyweight cotton, screen-printed drops — browse the current designs.",
    images: ["/og-home.png"],
  },
};

export default function TShirtsPage() {
  return <TShirtsSection />;
}
