/**
 * FILE: app/(public)/features/page.tsx
 * ROLE: Public — "Why Choose This Template" page, served at "/features".
 *
 * PURPOSE:
 * Makes the case for the template over building from scratch or using
 * a generic site builder: the tech stack it's built on, what ships
 * out of the box, an interactive ROI calculator, and a comparison
 * table against the two alternatives. Data is static placeholder
 * content from lib/featuresData.ts, same pattern as /shop and
 * /portfolio, pending superAdmin-managed content.
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
  title: "Why Choose This Template | Matthew Studio",
  description:
    "The tech stack, the features that ship out of the box, and how the resort booking template compares to building from scratch or a generic site builder.",
  openGraph: {
    title: "Why Choose This Template | Matthew Studio",
    description:
      "The tech stack, the features that ship out of the box, and how the resort booking template compares to building from scratch or a generic site builder.",
    images: ["/og-features.png"],
  },
};

export default function FeaturesPage() {
  return (
    <>
      <header className="featuresPageHeader">
        <div className="featuresPageHeaderInner">
          <p className="eyebrow">Why Choose This Template</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Everything a resort booking site needs, already built
          </h1>
          <p className="heroSubtitle">
            A modern tech stack, a booking engine that actually works, and no months spent
            building the basics from zero.
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
          <h2 className="sectionTitle">Template vs. building it yourself</h2>
          <div className="comparisonTableWrapper">
            <table className="comparisonTable">
              <thead>
                <tr>
                  <th scope="col">Criteria</th>
                  <th scope="col" className="comparisonTableHighlightCol">
                    This Template
                  </th>
                  <th scope="col">From Scratch</th>
                  <th scope="col">Generic Builder</th>
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
          <Link href="/shop" className="buttonPrimary">
            View Template Shop
          </Link>
        </div>
      </section>
    </>
  );
}
