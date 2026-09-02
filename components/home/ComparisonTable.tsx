/**
 * FILE: components/home/ComparisonTable.tsx
 * ROLE: Public — reusable tier comparison table, primarily for the
 * Templates section's "Managed vs Self-Hosted vs Custom" breakdown
 * (IMPROVEMENTS.md Section 4A) but written generically enough to
 * compare any set of tiers, not just Templates.
 *
 * PURPOSE:
 * Renders tiers as columns (tablet/desktop) with a shared feature-row
 * list down the side. The `highlighted` tier gets the accent border
 * ("Most Popular"). Wrapped in a horizontally-scrollable container so
 * tablet width keeps the table intact instead of losing columns
 * (buyer_homepage_specification.md Section 5.2: "Tablet: Horizontal
 * scroll"). Below 768px the table is swapped for a vertical accordion
 * — one collapsible card per tier — per Section 5.2's mobile row:
 * "Vertical stack with accordion" (a cramped 640px-wide table doesn't
 * fit a 375px screen; scrolling sideways to compare tiers is worse UX
 * than expanding one tier at a time). Optional numeric `priceValue`
 * triggers a count-up animation on scroll into view (Section 3,
 * Pattern 3) — omit it and both layouts fall back to plain price text.
 *
 * DATA FLOW:
 * No data fetching — receives tiers via props. Compatible with
 * lib/pricingData.ts's PRICING_TIERS shape; any caller can pass its
 * own tier objects that satisfy ComparisonTier.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

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
  const prefersReducedMotion = usePrefersReducedMotion();

  // Counts up from 0 to `value` once the price scrolls into view — mirrors
  // the useMotionValue/useTransform counter pattern from Section 3,
  // Pattern 3, using a plain rAF loop to keep this component dependency-light.
  // Reduced-motion visitors get the final number immediately instead of
  // watching it climb (Section 7.5) — there's no meaningful "opacity-only"
  // equivalent for a counting number, so jumping straight to the answer
  // is the closest analog.
  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

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
  }, [isInView, value, prefersReducedMotion]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString("en-PH")}
    </span>
  );
}

/**
 * ComparisonAccordion
 * Mobile-only (<768px) replacement for the table: one collapsible
 * card per tier instead of a horizontally-scrolled grid. Defaults to
 * the `highlighted` tier open (or the first tier if none is
 * highlighted) so a mobile visitor sees a full feature list without
 * having to tap anything first. Opening a tier collapses whichever
 * was previously open — same single-open pattern as FAQAccordion.tsx.
 */
function ComparisonAccordion({ tiers, featureRows }: ComparisonTableProps) {
  const defaultOpenSlug = tiers.find((tier) => tier.highlighted)?.slug ?? tiers[0]?.slug ?? null;
  const [openSlug, setOpenSlug] = useState<string | null>(defaultOpenSlug);

  // Tier header button refs, indexed same as `tiers`, so ArrowUp/
  // ArrowDown can move focus directly without querying the DOM —
  // mirrors FAQAccordion.tsx's handleQuestionKeyDown.
  const tierButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleTierKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const tierCount = tiers.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (index + 1) % tierCount;
      tierButtonRefs.current[nextIndex]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previousIndex = (index - 1 + tierCount) % tierCount;
      tierButtonRefs.current[previousIndex]?.focus();
    } else if (event.key === "Escape") {
      setOpenSlug(null);
    }
  }

  return (
    <div className="comparisonAccordion">
      {tiers.map((tier, index) => {
        const isOpen = openSlug === tier.slug;

        return (
          <div
            key={tier.slug}
            className={
              tier.highlighted
                ? "comparisonAccordionItem comparisonAccordionItemHighlighted"
                : "comparisonAccordionItem"
            }
          >
            {tier.highlighted && <span className="comparisonTablePopularPill">Most Popular</span>}

            <button
              type="button"
              ref={(el) => {
                tierButtonRefs.current[index] = el;
              }}
              className="comparisonAccordionHeader"
              aria-expanded={isOpen}
              aria-controls={`comparison-accordion-panel-${tier.slug}`}
              onClick={() => setOpenSlug(isOpen ? null : tier.slug)}
              onKeyDown={(event) => handleTierKeyDown(event, index)}
            >
              <span className="comparisonAccordionHeaderText">
                <span className="comparisonTableTierName">{tier.name}</span>
                <span className="comparisonTableTierPrice">
                  {typeof tier.priceValue === "number" ? (
                    <AnimatedPrice value={tier.priceValue} prefix="₱" />
                  ) : (
                    tier.price
                  )}
                  {tier.priceSuffix && <span className="comparisonTableTierSuffix"> {tier.priceSuffix}</span>}
                </span>
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="comparisonAccordionChevron"
              >
                <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`comparison-accordion-panel-${tier.slug}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <ul className="comparisonAccordionFeatureList">
                    {featureRows.map((feature) => {
                      const included = tier.features.includes(feature);
                      return (
                        <li
                          key={feature}
                          className={
                            included
                              ? "comparisonAccordionFeatureRow"
                              : "comparisonAccordionFeatureRow comparisonAccordionFeatureRowExcluded"
                          }
                        >
                          {included ? (
                            <Check size={16} strokeWidth={2.5} className="comparisonTableCheck" aria-label="Included" />
                          ) : (
                            <span className="comparisonTableDash" aria-label="Not included">
                              —
                            </span>
                          )}
                          {feature}
                        </li>
                      );
                    })}
                  </ul>

                  {tier.ctaLabel && tier.ctaHref && (
                    <a
                      href={tier.ctaHref}
                      className={
                        tier.highlighted
                          ? "buttonPrimary comparisonTableCta comparisonAccordionCta"
                          : "buttonSecondary comparisonTableCta comparisonAccordionCta"
                      }
                    >
                      {tier.ctaLabel}
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function ComparisonTable({ tiers, featureRows }: ComparisonTableProps) {
  // Below 768px the table gives way to ComparisonAccordion — a 640px-min
  // table forces horizontal scrolling on a 375px screen, which the spec
  // (Section 5.2) calls out as mobile-only; tablet width and up keeps
  // the table. Same matchMedia + resize-listener pattern FeaturedProducts
  // uses for its own desktop/mobile split.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const applyMatch = () => setIsMobile(query.matches);
    applyMatch();
    query.addEventListener("change", applyMatch);
    return () => query.removeEventListener("change", applyMatch);
  }, []);

  return (
    <motion.div
      className="comparisonTableWrap"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {isMobile ? (
        <ComparisonAccordion tiers={tiers} featureRows={featureRows} />
      ) : (
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
      )}
    </motion.div>
  );
}
