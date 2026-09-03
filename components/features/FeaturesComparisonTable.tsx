/**
 * FILE: components/features/FeaturesComparisonTable.tsx
 * ROLE: Public — "Matthew Studio vs. doing it yourself" table on the
 * Features page (/features).
 *
 * PURPOSE:
 * Renders COMPARISON_ROWS with a staggered row entrance and a sticky
 * header pinned within the table's own scroll area — the same
 * pattern already used for /compare's comparison table (§6). Split
 * out from page.tsx (a Server Component, for its `metadata` export)
 * purely so this table can apply per-row motion.
 *
 * DATA FLOW:
 * Receives COMPARISON_ROWS as a prop from the Server Component page
 * — no fetch, static data passed straight through.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComparisonRow } from "@/lib/featuresData";

export default function FeaturesComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  // Row entrance staggers via motion.tr directly rather than
  // ScrollReveal's div wrapper — a div isn't a valid direct child of
  // <tbody>, same fix already used on /compare's ProductCompareTool.
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="comparisonTableWrapper">
      <table className="comparisonTable">
        <thead>
          <tr>
            <th scope="col">Criteria</th>
            <th scope="col" className="comparisonTableHighlightCol">
              Matthew Studio
            </th>
            <th scope="col">DIY / From Scratch</th>
            <th scope="col">Generic Marketplace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <motion.tr
              key={row.criteria}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <th scope="row">{row.criteria}</th>
              <td className="comparisonTableHighlightCol">{row.template}</td>
              <td>{row.fromScratch}</td>
              <td>{row.genericBuilder}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
