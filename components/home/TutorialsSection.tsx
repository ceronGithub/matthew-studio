/**
 * FILE: components/home/TutorialsSection.tsx
 * ROLE: Public — homepage section for the Tutorials category
 * (IMPROVEMENTS.md Section 4E). Purpose: "Educate buyers on what
 * fits them. Show depth of catalog." — one of the two lighter
 * sections, no comparison table or video demo.
 *
 * PURPOSE:
 * Header, a "Who's this for?" 3-persona callout (reuses FeatureGrid —
 * it's already the exact icon + role + one-line layout the spec
 * calls for), product cards for the "tutorials" category grouped by
 * level (Beginner → Intermediate → Advanced, staggered per group per
 * spec's "Entrance: Stagger by level group"), and a CTA.
 *
 * DATA FLOW:
 * Reads TUTORIAL_PERSONAS/TUTORIAL_COURSE_META/COURSE_LEVEL_LABELS
 * (tutorialsSectionData.ts) and PRODUCTS (productsData.ts) filtered
 * to category "tutorials", sorted into level order. Course level and
 * duration aren't part of the shared Product type (only this
 * category needs them), so they're layered on top of the reusable
 * ProductCard as a small badge/meta line rather than added to every
 * product in the catalog.
 */
"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { TUTORIAL_PERSONAS, TUTORIAL_COURSE_META, COURSE_LEVEL_LABELS, type CourseLevel } from "@/lib/tutorialsSectionData";

const TUTORIAL_PRODUCTS = PRODUCTS.filter((product) => product.category === "tutorials");

const LEVEL_ORDER: CourseLevel[] = ["beginner", "intermediate", "advanced"];

export default function TutorialsSection() {
  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader eyebrow="Tutorials" title="Learn from real projects" subtitle="Grouped by level, so you start at the right place." />

        <FeatureGrid items={TUTORIAL_PERSONAS} />

        <div className="productCardsGrid">
          {LEVEL_ORDER.flatMap((level, groupIndex) =>
            TUTORIAL_PRODUCTS.filter((product) => TUTORIAL_COURSE_META[product.id]?.level === level).map((product, itemIndex) => (
              <motion.div
                className="tutorialCardWrap"
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: groupIndex * 0.15 + itemIndex * 0.05, ease: "easeOut" }}
              >
                <div className="tutorialCardMeta">
                  <span className={`levelBadge levelBadge${level.charAt(0).toUpperCase()}${level.slice(1)}`}>{COURSE_LEVEL_LABELS[level]}</span>
                  <span className="tutorialCardDuration">{TUTORIAL_COURSE_META[product.id]?.duration}</span>
                </div>
                <ProductCard product={product} />
              </motion.div>
            ))
          )}
        </div>

        <div className="sectionCTA">
          <a href="/shop?category=tutorials" className="buttonPrimary">
            Browse All Courses
          </a>
        </div>
      </div>
    </section>
  );
}
