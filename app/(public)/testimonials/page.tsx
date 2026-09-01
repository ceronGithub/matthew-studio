/**
 * FILE: app/(public)/testimonials/page.tsx
 * ROLE: Public — Templates category testimonials, served at "/testimonials".
 *
 * PURPOSE:
 * Displays a quote grid (TestimonialGrid) from the same four Templates
 * clients shown on /case-studies, each linking back to their full case
 * study. Scoped to Templates only — case studies are all genuinely
 * "templates" category today (see lib/portfolioData.ts), so these
 * quotes are too. Marketplace-wide quotes across every category
 * (T-Shirts, AI Videos, File Tools, Tutorials, Game Characters) live
 * separately in the homepage's testimonials carousel — see
 * lib/homeTestimonialsData.ts. Data here is static placeholder content
 * from lib/testimonialsData.ts pending superAdmin-managed content.
 *
 * DATA FLOW:
 * 1. This Server Component reads TESTIMONIALS directly (no fetch
 *    needed — it's a local static array today).
 * 2. Testimonials are passed as props into the Client Component
 *    TestimonialGrid, which handles the entrance animations.
 */
import type { Metadata } from "next";
import Link from "next/link";
import "../../styles/testimonials.css";
import TestimonialGrid from "@/components/testimonials/TestimonialGrid";
import { TESTIMONIALS } from "@/lib/testimonialsData";

export const metadata: Metadata = {
  title: "Testimonials — Templates | Matthew Studio",
  description:
    "Hear from property owners and managers who launched on our Templates — real quotes from real properties.",
  openGraph: {
    title: "Testimonials — Templates | Matthew Studio",
    description:
      "Hear from property owners and managers who launched on our Templates — real quotes from real properties.",
    images: ["/og-testimonials.png"],
  },
};

export default function TestimonialsPage() {
  return (
    <>
      <header className="testimonialsPageHeader">
        <div className="testimonialsPageHeaderInner">
          <p className="eyebrow">Testimonials — Templates</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            What our template owners are saying
          </h1>
          <p className="heroSubtitle">
            Straight from the people running the properties in our Case Studies — no scripted
            quotes, just what changed for them.
          </p>
          <p className="testimonialsScopeNote">
            Buying from a different category? See{" "}
            <Link href="/#testimonials-section">quotes from every category</Link> on the
            homepage instead.
          </p>
        </div>
      </header>

      <TestimonialGrid testimonials={TESTIMONIALS} />

      <section className="testimonialsNoteSection">
        <div className="testimonialsNoteInner">
          <p className="testimonialsNoteText">Want to see the full story behind these results?</p>
          <Link href="/case-studies" className="buttonSecondary">
            View Case Studies
          </Link>
        </div>
      </section>
    </>
  );
}
