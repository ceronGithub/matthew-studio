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
 * Section 4), so cards no longer need to funnel through /shop. Each
 * card's icon tint and hover border color come from
 * lib/categoryAccentColors.ts (same palette as QuickWins' chips and
 * the homepage mockup) via a --categoryAccent CSS variable, applied
 * with a plain inline style — no per-category class needed.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";
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
import { CATEGORY_ACCENT_COLORS } from "@/lib/categoryAccentColors";

const CATEGORY_ICONS: Record<CategoryShowcaseItem["iconName"], LucideIcon> = {
  "layout-template": LayoutTemplate,
  shirt: Shirt,
  clapperboard: Clapperboard,
  wrench: Wrench,
  "book-open": BookOpen,
  box: Box,
};

export default function CategoryShowcase() {
  // Standardized scroll-entrance distance per buyer_homepage_specification.md
  // §13.2 — 24px on desktop/tablet, a lighter 12px on mobile so the
  // slide-up doesn't feel heavy on small screens (same convention as
  // components/shared/ScrollReveal.tsx used on the visitor pages).
  const isMobileViewport = useIsMobileViewport();
  const entranceDistance = isMobileViewport ? 12 : 24;

  return (
    <section className="categoryShowcaseSection">
      <div className="categoryShowcaseContainer">
        <motion.div
          className="categoryShowcaseHeader"
          initial={{ opacity: 0, y: entranceDistance }}
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
                style={{ "--categoryAccent": CATEGORY_ACCENT_COLORS[category.slug] } as CSSProperties}
                initial={{ opacity: 0, y: entranceDistance }}
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
