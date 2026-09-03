/**
 * FILE: app/(public)/features/page.tsx
 * ROLE: Public — "Why Choose Matthew Studio" page, served at "/features".
 *
 * PURPOSE:
 * Makes the case for buying from the marketplace over DIY/from-scratch
 * or a generic marketplace: the tech stack products are built on, what
 * ships out of the box across every category, an interactive ROI
 * calculator, and a comparison table against the two alternatives.
 * Marketplace-wide, not tied to any single category. Data is static
 * placeholder content from lib/featuresData.ts, same pattern as
 * /pricing and /case-studies, pending superAdmin-managed content.
 *
 * DATA FLOW:
 * 1. This Server Component reads TECH_STACK, INCLUDED_FEATURES, and
 *    COMPARISON_ROWS directly (no fetch needed — static arrays today).
 * 2. Everything below the hero renders server-side except the ROI
 *    calculator, the included-features list, and the comparison
 *    table, which are Client Components (useState for the sliders;
 *    motion.li / motion.tr for per-item/per-row entrance).
 *
 * MOTION:
 * Header, tech stack grid, and the closing note use the shared
 * ScrollReveal primitive (§3.1/§3.6) directly in this Server
 * Component. The included-features list and comparison table are
 * split into their own Client Component files purely so they can
 * apply motion.li/motion.tr per item — a ScrollReveal div isn't a
 * valid child of <ul>/<tbody>. This page had zero motion before this
 * pass.
 */
import type { Metadata } from "next";
import Link from "next/link";
import "../../styles/features.css";
import ROICalculator from "@/components/features/ROICalculator";
import IncludedFeaturesList from "@/components/features/IncludedFeaturesList";
import FeaturesComparisonTable from "@/components/features/FeaturesComparisonTable";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { TECH_STACK, INCLUDED_FEATURES, COMPARISON_ROWS } from "@/lib/featuresData";

export const metadata: Metadata = {
  title: "Why Choose Matthew Studio | Digital Marketplace",
  description:
    "The tech stack, the features that ship with every category, and how buying from Matthew Studio compares to DIY or a generic marketplace.",
  openGraph: {
    title: "Why Choose Matthew Studio | Digital Marketplace",
    description:
      "The tech stack, the features that ship with every category, and how buying from Matthew Studio compares to DIY or a generic marketplace.",
    images: ["/og-features.png"],
  },
};

export default function FeaturesPage() {
  return (
    <>
      <header className="featuresPageHeader">
        <ScrollReveal className="featuresPageHeaderInner">
          <p className="eyebrow">Why Choose Matthew Studio</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Every category, built on the same solid foundation
          </h1>
          <p className="heroSubtitle">
            A modern tech stack, products that actually work, and no months spent building the
            basics from zero — whatever category you're buying from.
          </p>
        </ScrollReveal>
      </header>

      {/* ------------------------------------------------------------
       * TECH STACK BREAKDOWN
       * ------------------------------------------------------------ */}
      <section className="featuresSection">
        <div className="featuresSectionInner">
          <p className="eyebrow">Tech Stack</p>
          <h2 className="sectionTitle">Built on tools that scale</h2>
          <div className="techStackGrid">
            {TECH_STACK.map((item, index) => (
              <ScrollReveal key={item.name} delay={index * 0.06}>
                <article className="techStackCard">
                  <h3 className="techStackName">{item.name}</h3>
                  <p className="techStackRole">{item.role}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------
       * WHAT'S INCLUDED
       * ------------------------------------------------------------ */}
      <section className="featuresSection featuresSectionAlt">
        <div className="featuresSectionInner">
          <p className="eyebrow">Out of the Box</p>
          <h2 className="sectionTitle">What's included, no add-ons required</h2>
          <IncludedFeaturesList features={INCLUDED_FEATURES} />
        </div>
      </section>

      {/* ------------------------------------------------------------
       * ROI CALCULATOR (Client Component)
       * ------------------------------------------------------------ */}
      <ROICalculator />

      {/* ------------------------------------------------------------
       * COMPARISON TABLE
       * ------------------------------------------------------------ */}
      <section className="featuresSection featuresSectionAlt">
        <div className="featuresSectionInner">
          <p className="eyebrow">Compare Your Options</p>
          <h2 className="sectionTitle">Matthew Studio vs. doing it yourself</h2>
          <FeaturesComparisonTable rows={COMPARISON_ROWS} />
        </div>
      </section>

      <section className="featuresNoteSection">
        <ScrollReveal className="featuresNoteInner">
          <p className="featuresNoteText">
            Ready to see pricing for each tier?
          </p>
          <Link href="/pricing" className="buttonPrimary">
            View Pricing
          </Link>
        </ScrollReveal>
      </section>
    </>
  );
}
