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
 * Reads AI_VIDEO_SAMPLES/AI_VIDEO_CUSTOM_CALLOUT
 * (aiVideosSectionData.ts) and PRODUCTS (productsData.ts) filtered
 * to category "ai-videos".
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import VideoCarousel from "@/components/home/VideoCarousel";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { PRODUCTS } from "@/lib/productsData";
import { AI_VIDEO_SAMPLES, AI_VIDEO_CUSTOM_CALLOUT } from "@/lib/aiVideosSectionData";

// Per-card stagger delay for the scroll-entrance animation — same
// values as ProductsGrid.tsx/TShirtsSection.tsx/TemplatesSection.tsx
// so every card grid across the site feels identical
// (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

const AI_VIDEO_PRODUCTS = PRODUCTS.filter((product) => product.category === "ai-videos");

export default function AIVideosSection() {
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

        <div className="productCardsGrid">
          {AI_VIDEO_PRODUCTS.map((product, index) => (
            <ScrollReveal
              key={product.id}
              delay={Math.min(index, STAGGER_CAP) * STAGGER_STEP_SECONDS}
            >
              <ProductCard product={product} />
            </ScrollReveal>
          ))}
        </div>

        <div className="sectionCTA">
          <Link href="/ai-videos" className="buttonPrimary">
            Get Started with AI Videos
          </Link>
        </div>
      </div>
    </section>
  );
}
