/**
 * FILE: components/home/HowItWorksSection.tsx
 * ROLE: Public — homepage's universal 3-step "How It Works" section.
 *
 * PURPOSE:
 * Explains the marketplace flow in three steps (Browse → Choose →
 * Start) that applies to every category, not just Templates. This is
 * intentionally a different component from
 * components/how-it-works/OnboardingFlow.tsx, which renders the
 * Template product's own per-tier signup timeline on the standalone
 * /how-it-works page — that page stays as-is; this section only lives
 * on the homepage.
 *
 * DATA FLOW:
 * Reads HOW_IT_WORKS_HOME_STEPS (static, lib/howItWorksHomeData.ts).
 * Each step icon scales in with a rotate on scroll-enter, and its
 * text card slides in from the side it sits on. Desktop (1024px+)
 * renders a vertical timeline with a center line (mediaQueries.css);
 * steps alternate which side of the line their text card sits on via
 * the "howItWorksHomeStepWrapOdd" class (spec 3.11/5.2 — "Vertical
 * timeline on desktop, alternating left/right cards"). Tablet and
 * mobile both stay the plain stacked column, matching the spec's
 * responsive table for this section.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Check, Rocket, type LucideIcon } from "lucide-react";
import { HOW_IT_WORKS_HOME_STEPS, type HowItWorksHomeStep } from "@/lib/howItWorksHomeData";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";

const STEP_ICONS: Record<HowItWorksHomeStep["iconName"], LucideIcon> = {
  search: Search,
  check: Check,
  rocket: Rocket,
};

export default function HowItWorksSection() {
  // Standardized scroll-entrance distance per buyer_homepage_specification.md
  // §13.2 — 24px on desktop/tablet, a lighter 12px on mobile. Only applies
  // to this header's vertical slide-up; the per-step cards below animate
  // on a horizontal x-axis (alternating left/right) and are unaffected.
  const isMobileViewport = useIsMobileViewport();
  const entranceDistance = isMobileViewport ? 12 : 24;

  return (
    <section id="how-it-works-section" className="howItWorksHomeSection">
      <div className="howItWorksHomeContainer">
        <motion.div
          className="howItWorksHomeHeader"
          initial={{ opacity: 0, y: entranceDistance }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="sectionTitle">How It Works</h2>
        </motion.div>

        <div className="howItWorksHomeSteps">
          {HOW_IT_WORKS_HOME_STEPS.map((item, index) => {
            const Icon = STEP_ICONS[item.iconName];
            // Odd steps (1, 3, ...) sit on the left of the desktop center
            // line, so their text should slide in from the left instead of
            // the right — mirrors the alternating side, not just the class.
            const isOddStep = index % 2 === 1;

            return (
              <div className={`howItWorksHomeStepWrap${isOddStep ? " howItWorksHomeStepWrapOdd" : ""}`} key={item.step}>
                <motion.div
                  className="howItWorksHomeStep"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delayChildren: index * 0.15, staggerChildren: 0.1 }}
                >
                  <motion.div
                    className="howItWorksHomeIconWrap"
                    variants={{
                      hidden: { opacity: 0, scale: 0, rotate: 0 },
                      visible: { opacity: 1, scale: 1, rotate: 360 },
                    }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  >
                    <span className="howItWorksHomeStepNumber">{item.step}</span>
                    <Icon size={28} strokeWidth={1.75} className="howItWorksHomeIcon" aria-hidden="true" />
                  </motion.div>

                  <motion.div
                    className="howItWorksHomeStepText"
                    variants={{
                      hidden: { opacity: 0, x: isOddStep ? 30 : -30 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <h3 className="howItWorksHomeStepTitle">{item.title}</h3>
                    <p className="howItWorksHomeStepDescription">{item.description}</p>
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="howItWorksHomeCtaRow">
          <Link href="/products" className="buttonSecondary">
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
