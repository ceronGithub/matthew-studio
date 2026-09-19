/**
 * FILE: components/home/AIVideosSection.tsx
 * ROLE: Public — homepage section for the AI Videos category
 * (IMPROVEMENTS.md Section 4C). Purpose: "Show capability through
 * examples. Enable custom orders."
 *
 * PURPOSE:
 * Header, the reusable VideoCarousel (Phase 1 component — this
 * section is the one the carousel was originally specced for)
 * showing 2-3 sample videos, a "Need custom videos?" callout with a
 * contact CTA, product cards for the "ai-videos" category, and the
 * section CTA.
 *
 * DATA FLOW:
 * Reads AI_VIDEO_SAMPLES/AI_VIDEO_CUSTOM_CALLOUT (aiVideosSectionData.ts,
 * static — no database backing yet) and fetches the live "ai-videos"
 * product cards via useCategoryProducts (task-131), replacing the old
 * static PRODUCTS filter so a DB-only product appears here without a
 * code change — same pattern as task-126..130.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import VideoCarousel from "@/components/home/VideoCarousel";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useCategoryProducts } from "@/lib/hooks/useCategoryProducts";
import { AI_VIDEO_SAMPLES, AI_VIDEO_CUSTOM_CALLOUT } from "@/lib/aiVideosSectionData";

// Per-card stagger delay for the scroll-entrance animation — same
// values as ProductsGrid.tsx/TShirtsSection.tsx/TemplatesSection.tsx
// so every card grid across the site feels identical
// (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

// How many placeholder cards the loading skeleton shows (Rule 25.2).
const SKELETON_CARD_COUNT = 3;

export default function AIVideosSection() {
  const { products, isLoading, error, refetch } = useCategoryProducts("ai-videos");

  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader
          eyebrow="AI Videos"
          title="Templates meet custom creation"
          subtitle="Ready-made video packs, or a one-off built around your brief."
        />

        <VideoCarousel videos={AI_VIDEO_SAMPLES} />

        <motion.div
          className="customCallout"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="customCalloutText">
            <p className="customCalloutHeadline">{AI_VIDEO_CUSTOM_CALLOUT.headline}</p>
            <p className="customCalloutBody">{AI_VIDEO_CUSTOM_CALLOUT.body}</p>
          </div>
          <a href={AI_VIDEO_CUSTOM_CALLOUT.ctaHref} className="buttonSecondary customCalloutCta">
            {AI_VIDEO_CUSTOM_CALLOUT.ctaLabel}
          </a>
        </motion.div>

        {isLoading ? (
          // Loading state (Rule 25.2) — skeleton cards mirror the real card shape.
          <div className="productCardsGrid" aria-busy="true" aria-label="Loading AI videos">
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
          <p className="productsEmpty">No AI Videos products are published yet.</p>
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
          <Link href="/ai-videos" className="buttonPrimary">
            Get Started with AI Videos
          </Link>
        </div>
      </div>
    </section>
  );
}
