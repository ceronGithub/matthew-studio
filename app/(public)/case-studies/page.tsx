/**
 * FILE: app/(public)/case-studies/page.tsx
 * ROLE: Public — Case Studies index, served at "/case-studies".
 *
 * PURPOSE:
 * Rebrand of the old "/portfolio" (improvement_1.md Section 3/5) —
 * lists every case study as a card grid (PortfolioGrid, reused as-is).
 * Each card links to its own case study at /case-studies/[slug] and
 * shows a category badge. Data is static placeholder content from
 * lib/portfolioData.ts pending superAdmin-managed content.
 *
 * DATA FLOW:
 * 1. This Server Component reads PORTFOLIO_PROJECTS directly (no fetch
 *    needed — it's a local static array today).
 * 2. Projects are passed as props into the Client Component PortfolioGrid,
 *    which handles the entrance animations.
 */
import type { Metadata } from "next";
import "../../styles/portfolio.css";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { PORTFOLIO_PROJECTS } from "@/lib/portfolioData";

export const metadata: Metadata = {
  title: "Case Studies | Matthew Studio",
  description:
    "Real projects, real results — see how creators and businesses are using Matthew Studio products in production.",
  openGraph: {
    title: "Case Studies | Matthew Studio",
    description:
      "Real projects, real results — see how creators and businesses are using Matthew Studio products in production.",
    images: ["/og-case-studies.png"],
  },
};

export default function CaseStudiesPage() {
  return (
    <>
      <header className="portfolioPageHeader">
        <div className="portfolioPageHeaderInner">
          <p className="eyebrow">Case Studies</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Real projects, real results
          </h1>
          <p className="heroSubtitle">
            Every project below is a real deployment — the problem the client had, what we
            built, and the results after launch. More categories will join Templates here as
            they ship their own case studies.
          </p>
        </div>
      </header>

      <PortfolioGrid projects={PORTFOLIO_PROJECTS} />
    </>
  );
}
