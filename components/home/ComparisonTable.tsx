/**
 * FILE: components/home/ComparisonTable.tsx
 * ROLE: Public — reusable tier comparison table, primarily for the
 * Templates section's "Managed vs Self-Hosted vs Custom" breakdown
 * (IMPROVEMENTS.md Section 4A) but written generically enough to
 * compare any set of tiers, not just Templates.
 *
 * PURPOSE:
 * Renders tiers as columns (desktop) with a shared feature-row list
 * down the side. The `highlighted` tier gets the accent border
 * ("Most Popular"). Wrapped in a horizontally-scrollable container so
 * narrow screens keep the table intact instead of losing columns
 * (Section 5, Mobile adjustments: "3-column → ... scrollable
 * horizontally on narrow screens"). Optional numeric `priceValue`
 * triggers a count-up animation on scroll into view (Section 3,
 * Pattern 3) — omit it and the table falls back to plain price text.
 *
 * DATA FLOW:
 * No data fetching — receives tiers via props. Compatible with
 * lib/pricingData.ts's PRICING_TIERS shape; any caller can pass its
 * own tier objects that satisfy ComparisonTier.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";

export interface ComparisonTier {
  slug: string;
  name: string;
  /** Display price, e.g. "$149" or "Starting at $6,000". Shown as-is when priceValue is omitted. */
  price: string;
  /** Optional plain number to animate as a count-up; leave undefined to just show `price` statically. */
  priceValue?: number;
  priceSuffix?: string;
  features: string[];
  ctaLabel?: string;
  ctaHref?: string;
  highlighted?: boolean;
}

interface ComparisonTableProps {
  tiers: ComparisonTier[];
  /** Full ordered feature list — a tier "has" a feature if it's included in that tier's `features` array. */
  featureRows: string[];
}

function AnimatedPrice({ value, prefix = "" }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const [displayValue, setDisplayValue] = useState(0);

  // Counts up from 0 to `value` once the price scrolls into view — mirrors
  // the useMotionValue/useTransform counter pattern from Section 3,
  // Pattern 3, using a plain rAF loop to keep this component dependency-light.
  useEffect(() => {
    if (!isInView) return;
    const durationMs = 1500;
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
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString("en-PH")}
    </span>
  );
}

export default function ComparisonTable({ tiers, featureRows }: ComparisonTableProps) {
  return (
    <motion.div
      className="comparisonTableWrap"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <table className="comparisonTable">
        <thead>
          <tr>
            <th className="comparisonTableFeatureHeader" scope="col">
              <span className="srOnly">Feature</span>
            </th>
            {tiers.map((tier) => (
              <th
                key={tier.slug}
                scope="col"
                className={tier.highlighted ? "comparisonTableTierHeader comparisonTableTierHighlighted" : "comparisonTableTierHeader"}
              >
                {tier.highlighted && <span className="comparisonTablePopularPill">Most Popular</span>}
                <span className="comparisonTableTierName">{tier.name}</span>
                <span className="comparisonTableTierPrice">
                  {typeof tier.priceValue === "number" ? (
                    <AnimatedPrice value={tier.priceValue} prefix="₱" />
                  ) : (
                    tier.price
                  )}
                  {tier.priceSuffix && <span className="comparisonTableTierSuffix"> {tier.priceSuffix}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureRows.map((feature) => (
            <tr key={feature}>
              <th scope="row" className="comparisonTableFeatureLabel">
                {feature}
              </th>
              {tiers.map((tier) => (
                <td key={tier.slug} className={tier.highlighted ? "comparisonTableTierHighlighted" : undefined}>
                  {tier.features.includes(feature) ? (
                    <Check size={18} strokeWidth={2.5} className="comparisonTableCheck" aria-label="Included" />
                  ) : (
                    <span className="comparisonTableDash" aria-label="Not included">
                      —
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {tiers.some((tier) => tier.ctaLabel) && (
          <tfoot>
            <tr>
              <td />
              {tiers.map((tier) => (
                <td key={tier.slug} className={tier.highlighted ? "comparisonTableTierHighlighted" : undefined}>
                  {tier.ctaLabel && tier.ctaHref && (
                    <a
                      href={tier.ctaHref}
                      className={tier.highlighted ? "buttonPrimary comparisonTableCta" : "buttonSecondary comparisonTableCta"}
                    >
                      {tier.ctaLabel}
                    </a>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </motion.div>
  );
}
