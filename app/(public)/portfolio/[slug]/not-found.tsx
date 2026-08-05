/**
 * FILE: app/(public)/portfolio/[slug]/not-found.tsx
 * ROLE: Public — rendered when a /portfolio/[slug] URL doesn't match
 * any known project (Rule 31.10).
 *
 * PURPOSE:
 * Friendly dead-end for a bad or removed case study link, with a
 * clear path back to the full portfolio grid.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "../../../styles/portfolio.css";

export default function CaseStudyNotFound() {
  return (
    <div className="portfolioNotFound">
      <p className="eyebrow">404</p>
      <h1 className="heroTitle" style={{ fontSize: "2rem" }}>
        We couldn&apos;t find that case study
      </h1>
      <p className="heroSubtitle">
        It may have been renamed or removed. Take a look at the full portfolio instead.
      </p>
      <Link href="/portfolio" className="buttonPrimary">
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        Back to Portfolio
      </Link>
    </div>
  );
}
