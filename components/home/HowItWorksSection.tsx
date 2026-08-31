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
 * Each step icon scales in with a rotate on scroll-enter, and the
 * connecting line between steps animates its width in afterward.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Check, Rocket, type LucideIcon } from "lucide-react";
import { HOW_IT_WORKS_HOME_STEPS, type HowItWorksHomeStep } from "@/lib/howItWorksHomeData";

const STEP_ICONS: Record<HowItWorksHomeStep["iconName"], LucideIcon> = {
  search: Search,
  check: Check,
  rocket: Rocket,
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works-section" className="howItWorksHomeSection">
      <div className="howItWorksHomeContainer">
        <motion.div
          className="howItWorksHomeHeader"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="sectionTitle">How It Works</h2>
        </motion.div>

        <div className="howItWorksHomeSteps">
          {HOW_IT_WORKS_HOME_STEPS.map((item, index) => {
            const Icon = STEP_ICONS[item.iconName];
            const isLastStep = index === HOW_IT_WORKS_HOME_STEPS.length - 1;

            return (
              <div className="howItWorksHomeStepWrap" key={item.step}>
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
                      hidden: { opacity: 0, x: -30 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <h3 className="howItWorksHomeStepTitle">{item.title}</h3>
                    <p className="howItWorksHomeStepDescription">{item.description}</p>
                  </motion.div>
                </motion.div>

                {/* Connecting line — hidden after the last step, and hidden
                    entirely on mobile via mediaQueries.css (steps stack). */}
                {!isLastStep && (
                  <motion.span
                    className="howItWorksHomeConnector"
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: index * 0.15 + 0.3 }}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="howItWorksHomeCtaRow">
          <Link href="/shop" className="buttonSecondary">
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
