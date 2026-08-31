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
 * (templatesSectionData.ts) for the rest, and PRODUCTS
 * (productsData.ts) filtered to category "templates" for the card
 * grid. The comparison table's feature rows are the union of every
 * tier's own `features` bullets (deduped, first-seen order) rather
 * than a separately invented master list — this keeps the table
 * accurate to the tier data that already exists instead of risking
 * drift between two descriptions of the same tiers.
 */
"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import ComparisonTable, { type ComparisonTier } from "@/components/home/ComparisonTable";
import FeatureGrid from "@/components/home/FeatureGrid";
import VideoCarousel from "@/components/home/VideoCarousel";
import ProductCard from "@/components/home/ProductCard";
import { PRICING_TIERS } from "@/lib/pricingData";
import { PRODUCTS } from "@/lib/productsData";
import { TEMPLATE_BENEFITS, TEMPLATE_WHY_US, TEMPLATE_DEMO_VIDEOS } from "@/lib/templatesSectionData";

const TEMPLATE_PRODUCTS = PRODUCTS.filter((product) => product.category === "templates");

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
              initial={{ opacity: 0, y: 20 }}
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

        <div className="productCardsGrid">
          {TEMPLATE_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="sectionCTA">
          <a href="/shop" className="buttonPrimary">
            Explore Templates
          </a>
        </div>
      </div>
    </section>
  );
}
