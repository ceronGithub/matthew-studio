/**
 * FILE: components/shared/SectionHeader.tsx
 * ROLE: Public — shared across every homepage category section.
 *
 * PURPOSE:
 * Renders the standard eyebrow + title + optional subtitle block
 * defined in IMPROVEMENTS.md Section 2 (Typography) and used at the
 * top of every category section (Templates, T-Shirts, AI Videos,
 * File Tools, Tutorials, Game Characters). Centralizes the fade+slide
 * entrance animation (Section 3, Pattern 1) so every section gets the
 * same timing without re-implementing it per section.
 *
 * DATA FLOW:
 * No data fetching — pure presentational component driven by props.
 */
"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  /** Small uppercase label above the title, e.g. "Templates" or "Category badge". */
  eyebrow: string;
  /** Main headline/slogan for the section. */
  title: string;
  /** Optional supporting description shown below the title. */
  subtitle?: string;
  /** Left-align instead of the default centered layout — used by denser sections. */
  align?: "center" | "left";
}

export default function SectionHeader({ eyebrow, title, subtitle, align = "center" }: SectionHeaderProps) {
  return (
    <motion.div
      className={align === "left" ? "sectionHeader sectionHeaderLeft" : "sectionHeader"}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="sectionTitle">{title}</h2>
      {subtitle && <p className="sectionSubtitle">{subtitle}</p>}
    </motion.div>
  );
}
