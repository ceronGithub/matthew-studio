/**
 * FILE: hooks/useMediaCarousel.ts
 * PURPOSE:
 * Cycles through a fixed number of items on a timer, pausing while the
 * pointer is over the carousel and skipping autoplay entirely under
 * the OS-level "reduce motion" preference (Rule 17.5 — matches
 * globals.css's reduced-motion handling for CSS transitions). Used by
 * HeroSection and QuickWins for their rotating media showcases.
 *
 * DATA FLOW:
 * Caller passes the item count and interval; this hook only tracks
 * which index is active — the caller owns the actual item list and
 * decides what to render for that index.
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface UseMediaCarouselResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  pause: () => void;
  resume: () => void;
}

export function useMediaCarousel(itemCount: number, intervalMs: number = 5000): UseMediaCarouselResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (itemCount <= 1) return;

    // Respect the OS-level reduce-motion preference — never auto-advance
    // for users who've asked for less motion; they can still click a
    // dot/thumbnail to change the active item manually.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex((current) => (current + 1) % itemCount);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [itemCount, intervalMs]);

  return {
    activeIndex,
    setActiveIndex,
    pause: () => {
      isPausedRef.current = true;
    },
    resume: () => {
      isPausedRef.current = false;
    },
  };
}
