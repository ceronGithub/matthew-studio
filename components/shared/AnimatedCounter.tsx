/**
 * FILE: components/shared/AnimatedCounter.tsx
 * ROLE: Shared — inline number that counts up from 0 once scrolled
 * into view.
 *
 * PURPOSE:
 * Same rAF count-up pattern as ComparisonTable.tsx's local
 * AnimatedPrice, pulled out here so any stat display (currently
 * QuickWins' "18+ Products" style numbers, per homepage spec Section
 * 3.2: "Stats animate from 0 to final value (count-up) when section
 * enters viewport") can reuse it without duplicating the rAF loop.
 * ComparisonTable keeps its own AnimatedPrice as-is — it formats with
 * toLocaleString for currency, which this component doesn't need.
 *
 * DATA FLOW:
 * No data fetching — receives a target `value` and optional
 * `prefix`/`suffix` strings via props, counts up locally, renders
 * nothing else.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

interface AnimatedCounterProps {
  /** Final number to count up to. */
  value: number;
  /** Text shown before the number, e.g. "$". */
  prefix?: string;
  /** Text shown after the number, e.g. "+" or "h". */
  suffix?: string;
  /** How long the count-up takes once triggered. */
  durationMs?: number;
}

export default function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  durationMs = 1500,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const [displayValue, setDisplayValue] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Counts up from 0 to `value` once the number scrolls into view.
  // Reduced-motion visitors get the final number immediately instead
  // of watching it climb (spec Section 7.5) — there's no meaningful
  // "opacity-only" equivalent for a counting number, so jumping
  // straight to the answer is the closest analog.
  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      setDisplayValue(Math.round(progress * value));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isInView, value, durationMs, prefersReducedMotion]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString("en-PH")}
      {suffix}
    </span>
  );
}
