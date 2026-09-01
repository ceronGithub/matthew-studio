/**
 * FILE: app/(public)/portfolio/[slug]/page.tsx
 * ROLE: Public — retired route, served at "/portfolio/[slug]".
 *
 * PURPOSE:
 * "/portfolio/[slug]" is rebranded to "/case-studies/[slug]" per
 * improvement_1.md Section 3/5. Redirects preserve the slug so old
 * deep links (e.g. a shared /portfolio/cabana-bay-resort URL) land on
 * the same case study at its new address instead of 404ing.
 *
 * DATA FLOW:
 * No content rendered — redirect() throws immediately on request,
 * before any component body executes.
 */
import { redirect } from "next/navigation";

interface RetiredCaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PortfolioSlugPage({ params }: RetiredCaseStudyPageProps) {
  const { slug } = await params;
  redirect(`/case-studies/${slug}`);
}
