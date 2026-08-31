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

import SectionHeader from "@/components/shared/SectionHeader";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { FILE_TOOLS_FEATURES } from "@/lib/fileToolsSectionData";

const FILE_TOOLS_PRODUCTS = PRODUCTS.filter((product) => product.category === "file-tools");

export default function FileToolsSection() {
  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader
          eyebrow="File Tools"
          title="Productivity tools for creators"
          subtitle="Small utilities that save you the busywork between projects."
        />

        <FeatureGrid items={FILE_TOOLS_FEATURES} />

        <div className="productCardsGrid">
          {FILE_TOOLS_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="sectionCTA">
          <a href="/shop?category=file-tools" className="buttonPrimary">
            Explore Tools
          </a>
        </div>
      </div>
    </section>
  );
}