/**
 * FILE: components/home/QuickWins.tsx
 * ROLE: Public — second section of the Home/Landing page.
 *
 * PURPOSE:
 * Builds quick credibility below the hero for the marketplace as a
 * whole (not one category): a row of the 6 categories on offer, and
 * a short strip of headline marketplace stats. Numbers below are
 * placeholders — replace with real verified metrics before launch.
 */
"use client";

import { motion } from "framer-motion";

const CATEGORY_CHIPS = ["Templates", "T-Shirts", "AI Videos", "File Tools", "Tutorials", "Game Characters"];

const RESULT_STATS = [
  { value: "18+", label: "Products across 6 categories" },
  { value: "6", label: "Creator categories in one marketplace" },
  { value: "48h", label: "Average delivery time" },
];

export default function QuickWins() {
  return (
    <section className="quickWinsSection">
      <div className="quickWinsContainer">
        <p className="quickWinsLabel">One marketplace, every category creators need</p>

        <div className="wordmarkRow">
          {CATEGORY_CHIPS.map((name, index) => (
            <motion.span
              key={name}
              className="wordmarkChip"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
            >
              {name}
            </motion.span>
          ))}
        </div>

        <div className="statGrid">
          {RESULT_STATS.map((stat, index) => (
            <motion.article
              key={stat.label}
              className="statCard"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
            >
              <p className="statValue">{stat.value}</p>
              <p className="statLabel">{stat.label}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
