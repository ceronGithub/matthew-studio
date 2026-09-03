/**
 * FILE: components/home/FileToolsSection.tsx
 * ROLE: Public — homepage section for the File Tools category
 * (IMPROVEMENTS.md Section 4D). Purpose: "Quick scannable overview.
 * High conversion on ratings." — the lightest of the six sections by
 * design (no comparison table, no video, no gallery).
 *
 * PURPOSE:
 * Header, the reusable FeatureGrid (3 items instead of Templates'
 * 6), product cards for the "file-tools" category with ratings given
 * visual prominence (handled by ProductCard's existing star+count
 * meta line — no separate treatment needed here), and CTA.
 *
 * DATA FLOW:
 * Reads FILE_TOOLS_FEATURES (fileToolsSectionData.ts) and PRODUCTS
 * (productsData.ts) filtered to category "file-tools".
 */
"use client";

import Link from "next/link";
import SectionHeader from "@/components/shared/SectionHeader";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { PRODUCTS } from "@/lib/productsData";
import { FILE_TOOLS_FEATURES } from "@/lib/fileToolsSectionData";

const FILE_TOOLS_PRODUCTS = PRODUCTS.filter((product) => product.category === "file-tools");

// Per-card stagger delay for the scroll-entrance animation — same
// values used across every other category grid so the whole site
// feels identical (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

export default function FileToolsSection() {
  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader
          eyebrow="File Tools"
          title="Productivity tools for creators"
          subtitle="Small utilities that save you the busywork between projects."
        />

        <FeatureGrid items={FILE_TOOLS_FEATURES} enableHover={false} />

        <div className="productCardsGrid">
          {FILE_TOOLS_PRODUCTS.map((product, index) => (
            <ScrollReveal
              key={product.id}
              delay={Math.min(index, STAGGER_CAP) * STAGGER_STEP_SECONDS}
            >
              <ProductCard product={product} />
            </ScrollReveal>
          ))}
        </div>

        <div className="sectionCTA">
          <Link href="/file-tools" className="buttonPrimary">
            Explore Tools
          </Link>
        </div>
      </div>
    </section>
  );
}