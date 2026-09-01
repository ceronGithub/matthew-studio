/**
 * FILE: components/portfolio/CaseStudyDetail.tsx
 * ROLE: Public — main content of a single case study page (/case-studies/[slug]).
 *
 * PURPOSE:
 * Displays the full case study: resort type, headline tagline, the
 * problem/solution pair side by side, the results stat grid, and a
 * closing CTA linking to the live demo and the template shop.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { PortfolioProject } from "@/lib/portfolioData";

export default function CaseStudyDetail({ project }: { project: PortfolioProject }) {
  return (
    <>
      <header className="portfolioPageHeader">
        <div className="portfolioPageHeaderInner">
          <Link href="/case-studies" className="caseStudyBackLink">
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back to Portfolio
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="caseStudyResortType">{project.resortType}</p>
            <h1 className="caseStudyTitle">{project.clientName}</h1>
            <p className="caseStudyTagline">{project.tagline}</p>
          </motion.div>
        </div>
      </header>

      <section className="caseStudySection">
        <div className="caseStudySectionInner">
          <div className="caseStudyGrid">
            <motion.div
              className="caseStudyBlock"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <p className="caseStudyBlockLabel">The Problem</p>
              <p className="caseStudyBlockText">{project.problem}</p>
            </motion.div>

            <motion.div
              className="caseStudyBlock"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            >
              <p className="caseStudyBlockLabel">The Solution</p>
              <p className="caseStudyBlockText">{project.solution}</p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="caseStudySection">
        <div className="caseStudySectionInner">
          <p className="caseStudyBlockLabel">Results</p>
          <div className="caseStudyResultsGrid">
            {project.results.map((result, index) => (
              <motion.article
                key={result.label}
                className="statCard"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
              >
                <p className="statValue">{result.value}</p>
                <p className="statLabel">{result.label}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="caseStudyCta">
        <h2 className="caseStudyTitle" style={{ fontSize: "1.75rem" }}>
          Want results like {project.clientName}&apos;s?
        </h2>
        <p className="caseStudyTagline">
          Browse the template tiers or book a walkthrough to see it running on your own resort.
        </p>
        <div className="caseStudyCtaActions">
          {project.liveDemoUrl && (
            <a
              href={project.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="buttonSecondary"
            >
              View Live Demo
              <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
            </a>
          )}
          <Link href="/templates" className="buttonPrimary">
            Browse Templates
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
