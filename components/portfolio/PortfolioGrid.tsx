/**
 * FILE: components/portfolio/PortfolioGrid.tsx
 * ROLE: Public — main content of the Portfolio/Showcase page (/portfolio).
 *
 * PURPOSE:
 * Renders every case study as a card in a responsive grid. Each card
 * links to its own case study page at /portfolio/[slug]. Entrance
 * animation is staggered per card via framer-motion, triggered once
 * the grid scrolls into view.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PortfolioProject } from "@/lib/portfolioData";

export default function PortfolioGrid({ projects }: { projects: PortfolioProject[] }) {
  return (
    <section className="portfolioGridSection">
      <div className="portfolioGrid">
        {projects.map((project, index) => (
          <motion.div
            key={project.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
          >
            <Link href={`/portfolio/${project.slug}`} className="portfolioCard">
              {/* Decorative cover — replace with a real project screenshot */}
              <div className="portfolioCardCover" aria-hidden="true">
                <span className="portfolioCardCoverLabel">{project.clientName}</span>
              </div>

              <div className="portfolioCardBody">
                <p className="portfolioCardResortType">{project.resortType}</p>
                <h2 className="portfolioCardTitle">{project.clientName}</h2>
                <p className="portfolioCardTagline">{project.tagline}</p>
              </div>

              <div className="portfolioCardTags">
                {project.tags.map((tag) => (
                  <span key={tag} className="portfolioCardTag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="portfolioCardFooter">
                Read the case study
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
