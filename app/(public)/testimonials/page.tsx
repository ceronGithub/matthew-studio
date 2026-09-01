/**
 * FILE: app/(public)/testimonials/page.tsx
 * ROLE: Public — Testimonials page, served at "/testimonials".
 *
 * PURPOSE:
 * Displays a quote grid (TestimonialGrid) from the same four clients
 * shown on /case-studies, each linking back to their full case study.
 * Data is static placeholder content from lib/testimonialsData.ts
 * pending superAdmin-managed content.
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
  title: "Testimonials | Matthew Studio",
  description:
    "Hear from resort owners and managers who launched on the booking template — real quotes from real properties.",
  openGraph: {
    title: "Testimonials | Matthew Studio",
    description:
      "Hear from resort owners and managers who launched on the booking template — real quotes from real properties.",
    images: ["/og-testimonials.png"],
  },
};

export default function TestimonialsPage() {
  return (
    <>
      <header className="testimonialsPageHeader">
        <div className="testimonialsPageHeaderInner">
          <p className="eyebrow">Testimonials</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            What resort owners are saying
          </h1>
          <p className="heroSubtitle">
            Straight from the people running the properties in our Case Studies — no scripted
            quotes, just what changed for them.
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
