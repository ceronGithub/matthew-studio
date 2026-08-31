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

import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import VideoCarousel from "@/components/home/VideoCarousel";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { AI_VIDEO_SAMPLES, AI_VIDEO_CUSTOM_CALLOUT } from "@/lib/aiVideosSectionData";

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
          {AI_VIDEO_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="sectionCTA">
          <a href="/shop?category=ai-videos" className="buttonPrimary">
            Get Started with AI Videos
          </a>
        </div>
      </div>
    </section>
  );
}
