/**
 * FILE: lib/hooks/usePrefersReducedMotion.ts
 * PURPOSE:
 * Reports whether the visitor's OS/browser has "reduce motion"
 * enabled (prefers-reduced-motion: reduce), per
 * buyer_homepage_specification.md Section 4/7.5 — used anywhere a
 * component drives its own continuous motion outside framer-motion's
 * entrance animations (auto-scrolling carousels, auto-play video,
 * count-up numbers), which the global <MotionConfig reducedMotion=
 * "user"> in app/layout.tsx doesn't reach since those loops are plain
 * rAF/IntersectionObserver code, not motion.* components.
 *
 * Re-checks on change (not just on mount) so a visitor who toggles
 * the OS setting mid-session — or a developer testing via DevTools'
 * "Emulate CSS prefers-reduced-motion" — sees the page react
 * immediately without a reload.
 */
"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMatch = () => setPrefersReducedMotion(query.matches);

    applyMatch();
    query.addEventListener("change", applyMatch);
    return () => query.removeEventListener("change", applyMatch);
  }, []);

  return prefersReducedMotion;
}
