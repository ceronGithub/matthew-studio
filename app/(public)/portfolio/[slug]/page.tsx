/**
 * FILE: app/(public)/portfolio/[slug]/page.tsx
 * ROLE: Public — single case study page, served at "/portfolio/[slug]".
 *
 * PURPOSE:
 * Looks up the matching project from lib/portfolioData.ts by slug and
 * renders the full case study via CaseStudyDetail. Calls notFound()
 * for any slug that doesn't match a known project, which renders the
 * sibling not-found.tsx in this route segment.
 *
 * DATA FLOW:
 * 1. generateStaticParams pre-renders one page per known project slug.
 * 2. generateMetadata builds per-project SEO tags from the same data.
 * 3. The page component looks up the project again at request/render
 *    time and passes it to the Client Component CaseStudyDetail.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../../styles/portfolio.css";
import CaseStudyDetail from "@/components/portfolio/CaseStudyDetail";
import { PORTFOLIO_PROJECTS, getPortfolioProjectBySlug } from "@/lib/portfolioData";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render a static page for every known project slug at build time
export async function generateStaticParams() {
  return PORTFOLIO_PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProjectBySlug(slug);

  // Unknown slug — return minimal metadata; the page itself calls notFound()
  if (!project) {
    return { title: "Case Study Not Found | Matthew Studio" };
  }

  const title = `${project.clientName} Case Study | Matthew Studio`;
  return {
    title,
    description: project.tagline,
    openGraph: { title, description: project.tagline, images: ["/og-portfolio.png"] },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = getPortfolioProjectBySlug(slug);

  // No matching project for this slug — render the not-found segment
  if (!project) {
    notFound();
  }

  return <CaseStudyDetail project={project} />;
}
