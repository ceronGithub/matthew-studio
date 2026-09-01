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
 *    calculator, which is a Client Component (needs useState for the
 *    sliders).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import "../../styles/features.css";
import ROICalculator from "@/components/features/ROICalculator";
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
        <div className="featuresPageHeaderInner">
          <p className="eyebrow">Why Choose Matthew Studio</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Every category, built on the same solid foundation
          </h1>
          <p className="heroSubtitle">
            A modern tech stack, products that actually work, and no months spent building the
            basics from zero — whatever category you're buying from.
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------
       * TECH STACK BREAKDOWN
       * ------------------------------------------------------------ */}
      <section className="featuresSection">
        <div className="featuresSectionInner">
          <p className="eyebrow">Tech Stack</p>
          <h2 className="sectionTitle">Built on tools that scale</h2>
          <div className="techStackGrid">
            {TECH_STACK.map((item) => (
              <article key={item.name} className="techStackCard">
                <h3 className="techStackName">{item.name}</h3>
                <p className="techStackRole">{item.role}</p>
              </article>
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
          <ul className="includedGrid">
            {INCLUDED_FEATURES.map((feature) => (
              <li key={feature.title} className="includedCard">
                <Check size={18} strokeWidth={2} className="includedCardIcon" aria-hidden="true" />
                <div>
                  <h3 className="includedCardTitle">{feature.title}</h3>
                  <p className="includedCardDescription">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
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
          <div className="comparisonTableWrapper">
            <table className="comparisonTable">
              <thead>
                <tr>
                  <th scope="col">Criteria</th>
                  <th scope="col" className="comparisonTableHighlightCol">
                    Matthew Studio
                  </th>
                  <th scope="col">DIY / From Scratch</th>
                  <th scope="col">Generic Marketplace</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.criteria}>
                    <th scope="row">{row.criteria}</th>
                    <td className="comparisonTableHighlightCol">{row.template}</td>
                    <td>{row.fromScratch}</td>
                    <td>{row.genericBuilder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="featuresNoteSection">
        <div className="featuresNoteInner">
          <p className="featuresNoteText">
            Ready to see pricing for each tier?
          </p>
          <Link href="/pricing" className="buttonPrimary">
            View Pricing
          </Link>
        </div>
      </section>
    </>
  );
}
