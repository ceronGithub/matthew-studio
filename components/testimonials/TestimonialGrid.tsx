/**
 * FILE: components/testimonials/TestimonialGrid.tsx
 * ROLE: Public — main content of the Testimonials page (/testimonials).
 *
 * PURPOSE:
 * Renders every testimonial as a quote card in a responsive grid.
 * Each card links to that client's full case study at
 * /case-studies/[slug]. Entrance animation is staggered per card via
 * framer-motion, same pattern as PortfolioGrid and PricingGrid.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Quote, ArrowRight } from "lucide-react";
import type { Testimonial } from "@/lib/testimonialsData";

export default function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="testimonialGridSection">
      <div className="testimonialGrid">
        {testimonials.map((testimonial, index) => (
          <motion.article
            key={testimonial.clientSlug}
            className="testimonialCard"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
          >
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
          </motion.article>
        ))}
      </div>
    </section>
  );
}
