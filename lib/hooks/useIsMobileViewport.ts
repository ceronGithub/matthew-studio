/**
 * FILE: lib/hooks/useIsMobileViewport.ts
 * PURPOSE:
 * Reports whether the viewport is at or below the shared mobile
 * breakpoint (≤768px, matching Rule 23.5's standard breakpoints and
 * mediaQueries.css), for the rare case where a motion value itself —
 * not just layout — needs to differ on mobile (visitor_specification.md
 * §3.1: entrance translateY is 24px on desktop/tablet but should be a
 * lighter 12px on mobile so the slide-up doesn't feel heavy on small
 * screens).
 *
 * Re-checks on resize/orientation change (not just on mount) so
 * rotating a device or resizing a browser window mid-session updates
 * the distance without a reload — same re-check pattern as
 * usePrefersReducedMotion.ts.
 */
"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 768px)";

export function useIsMobileViewport(): boolean {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const applyMatch = () => setIsMobileViewport(query.matches);

    applyMatch();
    query.addEventListener("change", applyMatch);
    return () => query.removeEventListener("change", applyMatch);
  }, []);

  return isMobileViewport;
}
