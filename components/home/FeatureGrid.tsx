/**
 * FILE: components/home/FeatureGrid.tsx
 * ROLE: Public — reusable benefits/features grid used by the
 * Templates section's "Benefits Grid" (IMPROVEMENTS.md Section 4A)
 * and the File Tools section's "feature grid" (Section 11, File
 * Structure comment).
 *
 * PURPOSE:
 * Renders a 2x3 grid (desktop) / 1-column (mobile) of icon + title +
 * 1-line description items, staggered fade-in on scroll (Section 3,
 * Pattern 2). Icon is passed per-item as a Lucide component so each
 * calling section supplies its own icon set rather than this
 * component owning a fixed icon map.
 *
 * DATA FLOW:
 * No data fetching — receives `items` via props.
 */
"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";

export interface FeatureGridItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  items: FeatureGridItem[];
  /** Set false to render without the card background-shift + icon-rotate
   * hover effect — e.g. File Tools' Feature Grid (IMPROVEMENTS.md
   * Section 4D: "No hover state needed (light content)"). Defaults to
   * true, matching the Templates Benefits Grid's spec (Section 4A:
   * "Hover: card background shifts, icon rotates 5deg"). */
  enableHover?: boolean;
}

// Parent container drives the stagger timing; each card just fades + rises.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export default function FeatureGrid({ items, enableHover = true }: FeatureGridProps) {
  // Standardized scroll-entrance distance per buyer_homepage_specification.md
  // §13.2 — 24px on desktop/tablet, a lighter 12px on mobile. Computed
  // per-render (rather than as a module-level constant) so it can react
  // to the viewport, since this grid is shared across sections.
  const isMobileViewport = useIsMobileViewport();
  const entranceDistance = isMobileViewport ? 12 : 24;
  const itemVariants = {
    hidden: { opacity: 0, y: entranceDistance },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      className="featureGrid"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div
            className={enableHover ? "featureGridItem" : "featureGridItem featureGridItemNoHover"}
            key={item.title}
            variants={itemVariants}
          >
            <Icon size={32} strokeWidth={1.5} className="featureGridIcon" aria-hidden="true" />
            <h3 className="featureGridTitle">{item.title}</h3>
            <p className="featureGridDescription">{item.description}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
