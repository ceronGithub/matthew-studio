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
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OnboardingFlow as OnboardingFlowType } from "@/lib/howItWorksData";

export default function OnboardingFlow({
  flows,
  initialSlug,
}: {
  flows: OnboardingFlowType[];
  initialSlug?: string;
}) {
  // Default to the flow matching ?tier=, or the first flow if no match
  const defaultFlow = flows.find((flow) => flow.tierSlug === initialSlug) ?? flows[0];
  const [activeSlug, setActiveSlug] = useState(defaultFlow.tierSlug);

  const activeFlow = flows.find((flow) => flow.tierSlug === activeSlug) ?? flows[0];

  return (
    <section className="onboardingSection">
      <div className="onboardingSectionInner">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="onboardingStepListInner"
            >
              {activeFlow.steps.map((step, index) => (
                <li key={step.title} className="onboardingStep">
                  <span className="onboardingStepNumber">{index + 1}</span>
                  <div className="onboardingStepContent">
                    <div className="onboardingStepHeader">
                      <h3 className="onboardingStepTitle">{step.title}</h3>
                      <span className="onboardingStepDuration">{step.duration}</span>
                    </div>
                    <p className="onboardingStepDescription">{step.description}</p>
                  </div>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
