/**
 * FILE: components/home/QuickWins.tsx
 * ROLE: Public — second section of the Home/Landing page.
 *
 * PURPOSE:
 * Builds quick credibility below the hero: a row of past-client
 * wordmarks and a short strip of headline results. All names and
 * numbers below are placeholders — replace with real client names
 * and verified metrics before launch.
 */
"use client";

import { motion } from "framer-motion";

const CLIENT_WORDMARKS = ["Cabana Bay Resort", "Azure Point", "Marlin Cove", "Solstice Villas"];

const RESULT_STATS = [
  { value: "+38%", label: "Direct bookings vs. phone-only" },
  { value: "5 hrs", label: "Saved per week on manual booking" },
  { value: "48h", label: "Average time to launch" },
];

export default function QuickWins() {
  return (
    <section className="quickWinsSection">
      <div className="quickWinsContainer">
        <p className="quickWinsLabel">Trusted by resorts already running the template</p>

        <div className="wordmarkRow">
          {CLIENT_WORDMARKS.map((name, index) => (
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
