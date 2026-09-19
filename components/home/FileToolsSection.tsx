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
 * Reads FILE_TOOLS_FEATURES (fileToolsSectionData.ts, static) and
 * fetches the live "file-tools" product cards via useCategoryProducts
 * (task-126's shared hook), replacing the old static PRODUCTS filter
 * so a DB-only product appears here without a code change.
 */
"use client";

import Link from "next/link";
import SectionHeader from "@/components/shared/SectionHeader";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useCategoryProducts } from "@/lib/hooks/useCategoryProducts";
import { FILE_TOOLS_FEATURES } from "@/lib/fileToolsSectionData";

// How many placeholder cards the loading skeleton shows (Rule 25.2).
const SKELETON_CARD_COUNT = 3;

// Per-card stagger delay for the scroll-entrance animation — same
// values used across every other category grid so the whole site
// feels identical (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

export default function FileToolsSection() {
  const { products, isLoading, error, refetch } = useCategoryProducts("file-tools");

  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader
          eyebrow="File Tools"
          title="Productivity tools for creators"
          subtitle="Small utilities that save you the busywork between projects."
        />

        <FeatureGrid items={FILE_TOOLS_FEATURES} enableHover={false} />

        {isLoading ? (
          // Loading state (Rule 25.2) — skeleton cards mirror the real card shape.
          <div className="productCardsGrid" aria-busy="true" aria-label="Loading file tools">
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <div key={index} className="productCardSkeleton">
                <div className="productCardSkeletonThumb skeletonBlock" />
                <div className="productCardSkeletonBody">
                  <div className="productCardSkeletonLine skeletonBlock" />
                  <div className="productCardSkeletonLine productCardSkeletonLine--short skeletonBlock" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state (Rule 25.4) — friendly message + retry, never the raw error.
          <div className="productsEmpty" role="alert">
            <p>{error}</p>
            <button type="button" className="buttonSecondary" onClick={refetch}>
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          // Empty state (Rule 25.3) — action-specific, never a blank grid.
          <p className="productsEmpty">No File Tools products are published yet.</p>
        ) : (
          <div className="productCardsGrid">
            {products.map((product, index) => (
              <ScrollReveal
                key={product.id}
                delay={Math.min(index, STAGGER_CAP) * STAGGER_STEP_SECONDS}
              >
                <ProductCard product={product} />
              </ScrollReveal>
            ))}
          </div>
        )}

        <div className="sectionCTA">
          <Link href="/file-tools" className="buttonPrimary">
            Explore Tools
          </Link>
        </div>
      </div>
    </section>
  );
}