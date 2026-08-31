/**
 * FILE: components/home/TutorialsSection.tsx
 * ROLE: Public — homepage section for the Tutorials category
 * (IMPROVEMENTS.md Section 4E). Purpose: "Educate buyers on what
 * fits them. Show depth of catalog." — one of the two lighter
 * sections (with File Tools), built from Phase 1 pieces plus one
 * section-specific persona grid.
 *
 * PURPOSE:
 * Header, a 3-persona "Who's this for?" callout (icon + role +
 * bullet, fade-in stagger, no hover state per spec), product cards
 * for the "tutorials" category ordered Beginner → Intermediate →
 * Advanced with a level badge and duration overlaid on each card,
 * and a CTA. ProductCard.tsx itself is untouched — level/duration are
 * rendered by this section only, from TUTORIAL_META, so the shared
 * card component stays free of tutorial-only fields.
 *
 * DATA FLOW:
 * Reads TUTORIAL_PERSONAS/TUTORIAL_META/TUTORIAL_LEVEL_ORDER
 * (tutorialsSectionData.ts) and PRODUCTS (productsData.ts) filtered
 * to category "tutorials", sorted by TUTORIAL_LEVEL_ORDER.
 */
"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { TUTORIAL_PERSONAS, TUTORIAL_META, TUTORIAL_LEVEL_ORDER } from "@/lib/tutorialsSectionData";

const TUTORIAL_PRODUCTS = PRODUCTS.filter((product) => product.category === "tutorials").sort(
  (a, b) => TUTORIAL_LEVEL_ORDER.indexOf(TUTORIAL_META[a.id].level) - TUTORIAL_LEVEL_ORDER.indexOf(TUTORIAL_META[b.id].level)
);

const LEVEL_BADGE_CLASS: Record<string, string> = {
  Beginner: "tutorialLevelBadge tutorialLevelBeginner",
  Intermediate: "tutorialLevelBadge tutorialLevelIntermediate",
  Advanced: "tutorialLevelBadge tutorialLevelAdvanced",
};

// Parent drives the 0.15s persona stagger (spec: "stagger 0.15s between cards").
const personaContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const personaItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function PersonaGrid() {
  return (
    <motion.div
      className="personaGrid"
      variants={personaContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {TUTORIAL_PERSONAS.map((persona, index) => {
        const Icon = persona.icon;
        return (
          <motion.div className={`personaItem personaItem${index}`} key={persona.role} variants={personaItemVariants}>
            <Icon size={32} strokeWidth={1.5} className="personaIcon" aria-hidden="true" />
            <span className="personaRole">{persona.role}</span>
            <p className="personaBullet">{persona.bullet}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default function TutorialsSection() {
  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader eyebrow="Tutorials" title="Learn from real projects" subtitle="Courses built from the same codebases we ship to clients, not isolated demos." />

        <PersonaGrid />

        <div className="productCardsGrid">
          {TUTORIAL_PRODUCTS.map((product) => {
            const meta = TUTORIAL_META[product.id];
            return (
              <div className="tutorialCardWrap" key={product.id}>
                <span className={LEVEL_BADGE_CLASS[meta.level]}>{meta.level}</span>
                <ProductCard product={product} />
                <p className="tutorialDuration">{meta.duration}</p>
              </div>
            );
          })}
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
