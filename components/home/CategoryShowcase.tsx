/**
 * FILE: components/home/CategoryShowcase.tsx
 * ROLE: Public — homepage section listing the 6 marketplace categories.
 *
 * PURPOSE:
 * Renders CATEGORY_SHOWCASE as a responsive grid of cards (3 cols
 * desktop, 2 tablet, 1 mobile — grid columns handled by CSS
 * auto-fill, no JS breakpoint logic needed). Cards fade+slide in on
 * scroll, staggered, and lift slightly with an accent border on hover.
 *
 * DATA FLOW:
 * Each card links directly to its own category page (e.g. /tshirts,
 * /ai-videos) — those 6 pages are already built (improvement_1.md
 * Section 4), so cards no longer need to funnel through /shop.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutTemplate,
  Shirt,
  Clapperboard,
  Wrench,
  BookOpen,
  Box,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_SHOWCASE, type CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

const CATEGORY_ICONS: Record<CategoryShowcaseItem["iconName"], LucideIcon> = {
  "layout-template": LayoutTemplate,
  shirt: Shirt,
  clapperboard: Clapperboard,
  wrench: Wrench,
  "book-open": BookOpen,
  box: Box,
};

export default function CategoryShowcase() {
  return (
    <section className="categoryShowcaseSection">
      <div className="categoryShowcaseContainer">
        <motion.div
          className="categoryShowcaseHeader"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="eyebrow">Browse By Category</p>
          <h2 className="sectionTitle">Whatever you&apos;re building, it&apos;s in here</h2>
        </motion.div>

        <div className="categoryGrid">
          {CATEGORY_SHOWCASE.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.iconName];
            return (
              <motion.article
                key={category.slug}
                className="categoryCard"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                whileHover={{ y: -4 }}
              >
                <span className="categoryCardIconWrap">
                  <Icon size={32} strokeWidth={1.75} className="categoryCardIcon" aria-hidden="true" />
                </span>

                <div className="categoryCardBody">
                  <div className="categoryCardHeading">
                    <h3 className="categoryCardName">{category.name}</h3>
                    {category.badge && <span className="categoryCardBadge">{category.badge}</span>}
                  </div>
                  <p className="categoryCardPrice">{category.startingPrice}</p>
                  <p className="categoryCardDescription">{category.description}</p>
                </div>

                <Link href={`/${category.slug}`} className="categoryCardLink">
                  Explore
                  <ArrowRight size={16} strokeWidth={1.75} className="categoryCardLinkIcon" aria-hidden="true" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
