/**
 * FILE: components/home/TemplatesSection.tsx
 * ROLE: Public — homepage section for the Templates category, the
 * highest-conversion-priority section per IMPROVEMENTS.md Section 4A.
 *
 * PURPOSE:
 * Full-depth section: comparison table (Managed vs Self-Hosted vs
 * Custom, reusing lib/pricingData.ts), a 6-item benefits grid, a
 * 3-column "Why Us" trust builder, a demo video, and the templates
 * category's product cards (from lib/productsData.ts) — in that
 * order, per the spec's Structure diagram.
 *
 * DATA FLOW:
 * Reads PRICING_TIERS (pricingData.ts) for the comparison table,
 * TEMPLATE_BENEFITS/TEMPLATE_WHY_US/TEMPLATE_DEMO_VIDEOS
 * (templatesSectionData.ts) for the rest of the static content, and
 * fetches the live "templates" product cards via useCategoryProducts
 * (task-126's shared hook), replacing the old static PRODUCTS filter
 * so a DB-only product appears here without a code change. The
 * comparison table's feature rows are the union of every tier's own
 * `features` bullets (deduped, first-seen order) rather than a
 * separately invented master list — this keeps the table accurate to
 * the tier data that already exists instead of risking drift between
 * two descriptions of the same tiers.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import ComparisonTable, { type ComparisonTier } from "@/components/home/ComparisonTable";
import FeatureGrid from "@/components/home/FeatureGrid";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";
import VideoCarousel from "@/components/home/VideoCarousel";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useCategoryProducts } from "@/lib/hooks/useCategoryProducts";
import { PRICING_TIERS } from "@/lib/pricingData";
import { TEMPLATE_BENEFITS, TEMPLATE_WHY_US, TEMPLATE_DEMO_VIDEOS } from "@/lib/templatesSectionData";

// How many placeholder cards the loading skeleton shows (Rule 25.2).
const SKELETON_CARD_COUNT = 3;

// Per-card stagger delay for the scroll-entrance animation — same
// values as ProductsGrid.tsx/TShirtsSection.tsx so every card grid
// across the site feels identical (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

const COMPARISON_TIERS: ComparisonTier[] = PRICING_TIERS.map((tier) => ({
  slug: tier.slug,
  name: tier.name,
  price: tier.price,
  priceSuffix: tier.priceSuffix,
  features: tier.features,
  ctaLabel: tier.ctaLabel,
  ctaHref: `/contact?tier=${tier.slug}`,
  highlighted: tier.highlighted,
}));

// Union of every tier's own feature bullets, deduped and kept in
// first-seen order — a row with only one checkmark is accurate
// (that feature really is exclusive to that tier), not a display bug.
const COMPARISON_FEATURE_ROWS = Array.from(new Set(PRICING_TIERS.flatMap((tier) => tier.features)));

export default function TemplatesSection() {
  // Standardized scroll-entrance distance per buyer_homepage_specification.md
  // §13.2 — 24px on desktop/tablet, a lighter 12px on mobile.
  const isMobileViewport = useIsMobileViewport();
  const entranceDistance = isMobileViewport ? 12 : 24;
  const { products, isLoading, error, refetch } = useCategoryProducts("templates");

  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader
          eyebrow="Templates"
          title="Production-ready booking sites, three ways to own one"
          subtitle="Every template ships with a real multi-room booking engine — not a page builder with a form bolted on."
        />

        <ComparisonTable tiers={COMPARISON_TIERS} featureRows={COMPARISON_FEATURE_ROWS} />

        <FeatureGrid items={TEMPLATE_BENEFITS} />

        <div className="whyUsGrid">
          {TEMPLATE_WHY_US.map((point, index) => (
            <motion.div
              className="whyUsItem"
              key={point.heading}
              initial={{ opacity: 0, y: entranceDistance }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            >
              <span className="whyUsHeading">{point.heading}</span>
              <p className="whyUsBody">{point.body}</p>
            </motion.div>
          ))}
        </div>

        <VideoCarousel videos={TEMPLATE_DEMO_VIDEOS} />

        {isLoading ? (
          // Loading state (Rule 25.2) — skeleton cards mirror the real card shape.
          <div className="productCardsGrid" aria-busy="true" aria-label="Loading templates">
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
          <p className="productsEmpty">No Templates products are published yet.</p>
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
          <Link href="/templates" className="buttonPrimary">
            Explore Templates
          </Link>
          <Link href="/testimonials" className="buttonSecondary">
            Read Testimonials
          </Link>
        </div>
      </div>
    </section>
  );
}
