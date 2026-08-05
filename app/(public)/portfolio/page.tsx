/**
 * FILE: app/(public)/portfolio/page.tsx
 * ROLE: Public — Portfolio/Showcase index, served at "/portfolio".
 *
 * PURPOSE:
 * Lists every past resort project as a card grid (PortfolioGrid).
 * Each card links to its own case study at /portfolio/[slug]. Data
 * is static placeholder content from lib/portfolioData.ts pending
 * superAdmin-managed content.
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
  title: "Portfolio | Matthew Studio",
  description:
    "See resort booking website templates in production — real problems, the solution shipped, and the results.",
  openGraph: {
    title: "Portfolio | Matthew Studio",
    description:
      "See resort booking website templates in production — real problems, the solution shipped, and the results.",
    images: ["/og-portfolio.png"],
  },
};

export default function PortfolioPage() {
  return (
    <>
      <header className="portfolioPageHeader">
        <div className="portfolioPageHeaderInner">
          <p className="eyebrow">Case Studies</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Resorts already running on the template
          </h1>
          <p className="heroSubtitle">
            Every project below is a real deployment — the problem the resort had, the tier we
            built on, and the results after launch.
          </p>
        </div>
      </header>

      <PortfolioGrid projects={PORTFOLIO_PROJECTS} />
    </>
  );
}
