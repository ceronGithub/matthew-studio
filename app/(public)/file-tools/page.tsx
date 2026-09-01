/**
 * FILE: app/(public)/file-tools/page.tsx
 * ROLE: Public — File Tools category page, served at "/file-tools".
 *
 * PURPOSE:
 * Standalone page for the File Tools category, per improvement_1.md
 * Section 4's missing-pages list. Renders the existing
 * FileToolsSection component (feature grid, product cards, CTA) as
 * the full page body — see /templates/page.tsx for why reusing the
 * existing section (vs. rebuilding it) is the right call here.
 *
 * DATA FLOW:
 * No data fetching in this file — FileToolsSection reads PRODUCTS and
 * fileToolsSectionData.ts itself. Every class it uses lives in
 * app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import FileToolsSection from "@/components/home/FileToolsSection";

export const metadata: Metadata = {
  title: "File Tools | Matthew Studio",
  description:
    "Small productivity tools that save you the busywork between projects — batch file conversion, PDF compression, background removal, and more.",
  openGraph: {
    title: "File Tools | Matthew Studio",
    description:
      "Small productivity tools that save you the busywork between projects — batch file conversion, PDF compression, background removal, and more.",
    images: ["/og-home.png"],
  },
};

export default function FileToolsPage() {
  return <FileToolsSection />;
}
