/**
 * FILE: components/shared/ScrollReveal.tsx
 * ROLE: Public — shared motion primitive for visitor-facing pages.
 *
 * PURPOSE:
 * Wraps any block of content so it fades and slides up into place the
 * first time it scrolls into view, per visitor_specification.md §3.1
 * (scroll entrance) and §3.6 (reduced motion). This is the single
 * shared building block every visitor page's card grid / section
 * entrance should use — never a one-off animation per component.
 *
 * DATA FLOW:
 * Pure presentational wrapper — no data fetching. `framer-motion`
 * (already a project dependency) handles the IntersectionObserver
 * under the hood via `whileInView`. `useReducedMotion` reads the
 * user's OS-level `prefers-reduced-motion` setting and, when set,
 * drops the translateY so only the opacity fade plays.
 *
 * MOTION:
 * §3.1 also calls for a lighter translateY on mobile (12px) than on
 * desktop/tablet (24px) — previously both used the same 24px value.
 * `useIsMobileViewport` (lib/hooks/useIsMobileViewport.ts) picks the
 * distance at ≤768px; reduced-motion still wins over both and drops
 * to 0.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";

interface ScrollRevealProps {
  children: ReactNode;
  /** Stagger delay in seconds — e.g. index * 0.06 for a grid of cards. */
  delay?: number;
  className?: string;
}

export default function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  // Respect the user's OS-level reduced-motion preference — when set,
  // skip the translateY entirely and keep only the opacity fade.
  const prefersReducedMotion = useReducedMotion();
  // §3.1: mobile gets a lighter 12px slide-up than desktop/tablet's 24px.
  const isMobileViewport = useIsMobileViewport();
  const translateDistance = prefersReducedMotion ? 0 : isMobileViewport ? 12 : 24;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: translateDistance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
