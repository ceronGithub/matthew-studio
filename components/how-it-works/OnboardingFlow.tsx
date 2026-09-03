/**
 * FILE: components/how-it-works/OnboardingFlow.tsx
 * ROLE: Public — main content of the How It Works page (/how-it-works).
 *
 * PURPOSE:
 * Lets a visitor switch between the three pricing tiers and see that
 * tier's step-by-step onboarding flow as a numbered timeline. Defaults
 * to the tier passed via the `?tier=` query param (e.g. a visitor
 * clicking through from a /shop CTA), falling back to the first tier
 * if none is present or the value doesn't match a known slug.
 *
 * MOTION (visitor_specification.md §3.1):
 * The tab list + timeline callout use the shared ScrollReveal primitive
 * for their first-scroll-into-view entrance. Switching tiers still
 * crossfades the whole step list (AnimatePresence, unchanged) but each
 * step within it now staggers in individually via variants + a
 * `useReducedMotion` check — previously the list animated in as one
 * flat block, which §3.1 explicitly calls out to avoid for lists.
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import type { OnboardingFlow as OnboardingFlowType } from "@/lib/howItWorksData";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function OnboardingFlow({
  flows,
  initialSlug,
}: {
  flows: OnboardingFlowType[];
  initialSlug?: string;
}) {
  // Respect the user's OS-level reduced-motion preference for the
  // per-step stagger below.
  const prefersReducedMotion = useReducedMotion();

  // Default to the flow matching ?tier=, or the first flow if no match
  const defaultFlow = flows.find((flow) => flow.tierSlug === initialSlug) ?? flows[0];
  const [activeSlug, setActiveSlug] = useState(defaultFlow.tierSlug);

  const activeFlow = flows.find((flow) => flow.tierSlug === activeSlug) ?? flows[0];

  // Parent list — no visual change of its own, just staggers when each
  // child <motion.li> starts its own fade-in by 0.06s.
  const listVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  // Each step's own fade+slide-up, matching ScrollReveal's values.
  const stepVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section className="onboardingSection">
      <ScrollReveal className="onboardingSectionInner">
        {/* Tab row — one tab per pricing tier */}
        <div className="onboardingTabList" role="tablist" aria-label="Select a pricing tier">
          {flows.map((flow) => {
            const isActive = flow.tierSlug === activeSlug;
            return (
              <button
                key={flow.tierSlug}
                type="button"
                role="tab"
                id={`tab-${flow.tierSlug}`}
                aria-selected={isActive}
                aria-controls={`panel-${flow.tierSlug}`}
                className={isActive ? "onboardingTab onboardingTabActive" : "onboardingTab"}
                onClick={() => setActiveSlug(flow.tierSlug)}
              >
                {flow.tierName}
              </button>
            );
          })}
        </div>

        {/* Active tier's total timeline callout */}
        <p className="onboardingTimeline">{activeFlow.totalTimeline}</p>

        {/* Step timeline for the active tier */}
        <div
          role="tabpanel"
          id={`panel-${activeFlow.tierSlug}`}
          aria-labelledby={`tab-${activeFlow.tierSlug}`}
          className="onboardingStepList"
        >
          <AnimatePresence mode="wait">
            <motion.ol
              key={activeFlow.tierSlug}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="onboardingStepListInner"
            >
              {activeFlow.steps.map((step, index) => (
                <motion.li key={step.title} variants={stepVariants} className="onboardingStep">
                  <span className="onboardingStepNumber">{index + 1}</span>
                  <div className="onboardingStepContent">
                    <div className="onboardingStepHeader">
                      <h3 className="onboardingStepTitle">{step.title}</h3>
                      <span className="onboardingStepDuration">{step.duration}</span>
                    </div>
                    <p className="onboardingStepDescription">{step.description}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </ScrollReveal>
    </section>
  );
}
