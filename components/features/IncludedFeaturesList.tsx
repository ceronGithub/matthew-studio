/**
 * FILE: components/features/IncludedFeaturesList.tsx
 * ROLE: Public — "What's Included" list on the Features page (/features).
 *
 * PURPOSE:
 * Renders INCLUDED_FEATURES as a staggered-entrance list. Split out
 * from page.tsx (which stays a Server Component for its `metadata`
 * export, per Rule 31.1/31.9 — metadata can't be exported from a
 * Client Component) purely so this list can apply per-item motion.
 *
 * DATA FLOW:
 * Receives INCLUDED_FEATURES as a prop from the Server Component page
 * — no fetch, static data passed straight through.
 */
"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { IncludedFeature } from "@/lib/featuresData";

export default function IncludedFeaturesList({ features }: { features: IncludedFeature[] }) {
  // Each item staggers in via motion.li directly rather than
  // ScrollReveal's div wrapper — a div isn't a valid direct child of
  // <ul>, same constraint already solved for /compare's table rows.
  const prefersReducedMotion = useReducedMotion();

  return (
    <ul className="includedGrid">
      {features.map((feature, index) => (
        <motion.li
          key={feature.title}
          className="includedCard"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <Check size={18} strokeWidth={2} className="includedCardIcon" aria-hidden="true" />
          <div>
            <h3 className="includedCardTitle">{feature.title}</h3>
            <p className="includedCardDescription">{feature.description}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
