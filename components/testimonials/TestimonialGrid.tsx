/**
 * FILE: components/testimonials/TestimonialGrid.tsx
 * ROLE: Public — main content of the Testimonials page (/testimonials).
 *
 * PURPOSE:
 * Renders every testimonial as a quote card in a responsive grid.
 * Each card links to that client's full case study at
 * /case-studies/[slug].
 *
 * MOTION:
 * Card entrance was previously a hand-rolled motion.article stagger
 * with no prefers-reduced-motion handling. Normalized to the shared
 * ScrollReveal primitive (visitor_specification.md §3.1/§3.6, Step 5)
 * so it picks up reduced-motion support for free, matching the fix
 * already applied to TutorialsSection.tsx's card grid.
 */
"use client";

import Link from "next/link";
import { Quote, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { Testimonial } from "@/lib/testimonialsData";

export default function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="testimonialGridSection">
      <div className="testimonialGrid">
        {testimonials.map((testimonial, index) => (
          <ScrollReveal key={testimonial.clientSlug} delay={index * 0.07}>
            <article className="testimonialCard">
              <Quote size={22} strokeWidth={1.75} className="testimonialCardQuoteIcon" aria-hidden="true" />

              <p className="testimonialCardQuote">&ldquo;{testimonial.quote}&rdquo;</p>

              <div className="testimonialCardFooter">
                <div>
                  <p className="testimonialCardPersonName">{testimonial.personName}</p>
                  <p className="testimonialCardPersonRole">
                    {testimonial.personRole}, {testimonial.clientName}
                  </p>
                </div>
                <span className="testimonialCardTierTag">{testimonial.tierTag}</span>
              </div>

              <Link href={`/case-studies/${testimonial.clientSlug}`} className="testimonialCardLink">
                Read the case study
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
