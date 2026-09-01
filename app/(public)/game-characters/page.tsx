/**
 * FILE: app/(public)/game-characters/page.tsx
 * ROLE: Public — Game Characters category page, served at
 * "/game-characters".
 *
 * PURPOSE:
 * Standalone page for the Game Characters category, per
 * improvement_1.md Section 4's missing-pages list. Renders the
 * existing GameCharactersSection component (thumbnail gallery with
 * lightbox, product cards, CTA) as the full page body — see
 * /templates/page.tsx for why reusing the existing section (vs.
 * rebuilding it) is the right call here.
 *
 * DATA FLOW:
 * No data fetching in this file — GameCharactersSection reads
 * PRODUCTS and gameCharactersSectionData.ts itself. Every class it
 * uses lives in app/styles/shared.css, already loaded globally by
 * app/(public)/layout.tsx — no extra CSS import needed here.
 */
import type { Metadata } from "next";
import GameCharactersSection from "@/components/home/GameCharactersSection";

export const metadata: Metadata = {
  title: "Game Characters | Matthew Studio",
  description:
    "3D-ready game characters — rigged, modular, and low-poly sets that export straight into your engine.",
  openGraph: {
    title: "Game Characters | Matthew Studio",
    description:
      "3D-ready game characters — rigged, modular, and low-poly sets that export straight into your engine.",
    images: ["/og-home.png"],
  },
};

export default function GameCharactersPage() {
  return <GameCharactersSection />;
}
