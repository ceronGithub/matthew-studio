/**
 * FILE: lib/portfolioData.ts
 * PURPOSE:
 * Static placeholder data for the Case Studies section — the grid at
 * /case-studies and each case study at /case-studies/[slug] both read
 * from this single source ("/portfolio" is retired, redirects here —
 * improvement_1.md Section 3). Client names match the wordmarks
 * previously shown on the Home page. Kept this file's name and the
 * PortfolioProject/PORTFOLIO_PROJECTS identifiers as-is (rather than
 * renaming to caseStudiesData.ts) to avoid a needless rename churn
 * across every file that imports them — only the user-facing route
 * changed. Each project now carries a `category` field so the page
 * is ready to filter/tag by marketplace category once categories
 * beyond Templates have case studies of their own.
 *
 * DATA FLOW:
 * No database yet — all entries are hardcoded placeholders pending
 * real client names, screenshots, and verified metrics. Once
 * Supabase is wired up for content management, this file is replaced
 * by a fetch from a `caseStudies` table (see overviewProject.txt
 * superAdmin section) — the shape below should map directly to that
 * table's columns.
 */

export interface PortfolioResult {
  value: string;
  label: string;
}

export interface PortfolioProject {
  slug: string;
  /** Which marketplace category this case study belongs to. All 4
   * projects today are Templates clients (genuinely, not a placeholder) —
   * this field is ready for other categories once they get case studies. */
  category: "templates" | "tshirts" | "ai-videos" | "file-tools" | "tutorials" | "game-characters";
  categoryLabel: string;
  clientName: string;
  resortType: string;
  tagline: string;
  problem: string;
  solution: string;
  results: PortfolioResult[];
  liveDemoUrl?: string;
  tags: string[];
}

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    slug: "cabana-bay-resort",
    category: "templates",
    categoryLabel: "Templates",
    clientName: "Cabana Bay Resort",
    resortType: "Beachfront family resort, 42 rooms",
    tagline: "Replaced phone-only booking with a live 24/7 engine.",
    problem:
      "Guests could only book by calling the front desk during office hours, so the resort lost same-day and overnight inquiries to competitors with online booking.",
    solution:
      "Launched the managed SaaS tier with real-time room availability, seasonal promo codes, and a super-admin dashboard the front-desk team could manage without a developer.",
    results: [
      { value: "+38%", label: "Direct bookings vs. phone-only" },
      { value: "48h", label: "Time to launch" },
      { value: "5 hrs", label: "Saved per week on manual booking" },
    ],
    liveDemoUrl: "https://demo.matthewstudio.com/cabana-bay",
    tags: ["Managed SaaS", "Family Resort", "Promo Codes"],
  },
  {
    slug: "azure-point",
    category: "templates",
    categoryLabel: "Templates",
    clientName: "Azure Point",
    resortType: "Boutique clifftop villas, 18 rooms",
    tagline: "A self-hosted booking site that matched their brand exactly.",
    problem:
      "As a boutique property, Azure Point needed full control over branding and hosting rather than a templated look-and-feel shared with other resorts.",
    solution:
      "Delivered the self-hosted tier with a custom color palette, brand typography, and full source-code ownership, deployed on their own infrastructure.",
    results: [
      { value: "+52%", label: "Increase in booking page conversion" },
      { value: "100%", label: "Brand-matched design, no template feel" },
      { value: "72h", label: "Time to launch, including brand pass" },
    ],
    liveDemoUrl: "https://demo.matthewstudio.com/azure-point",
    tags: ["Self-Hosted", "Boutique", "Custom Branding"],
  },
  {
    slug: "marlin-cove",
    category: "templates",
    categoryLabel: "Templates",
    clientName: "Marlin Cove",
    resortType: "Dive resort & marina, 30 rooms",
    tagline: "Multi-room booking plus add-on dive package upsells.",
    problem:
      "Guests booking rooms had no way to add dive packages or gear rental during checkout, so the resort's activities desk fielded a separate round of calls after every booking.",
    solution:
      "Built a custom retainer engagement adding add-on packages to the booking flow, letting guests bundle rooms with dive trips and gear rental in one checkout.",
    results: [
      { value: "+61%", label: "Guests adding a dive package at checkout" },
      { value: "3.2x", label: "Add-on revenue vs. prior season" },
      { value: "0", label: "Extra calls needed to book an add-on" },
    ],
    liveDemoUrl: "https://demo.matthewstudio.com/marlin-cove",
    tags: ["Custom Build", "Add-on Packages", "Marina"],
  },
  {
    slug: "solstice-villas",
    category: "templates",
    categoryLabel: "Templates",
    clientName: "Solstice Villas",
    resortType: "Adults-only villa retreat, 24 rooms",
    tagline: "Launched fast on the managed tier ahead of peak season.",
    problem:
      "With peak season five weeks out, Solstice Villas needed a fully working booking site without waiting on a custom development timeline.",
    solution:
      "Onboarded onto the managed SaaS tier, customized branding and room listings in the super-admin dashboard, and went live in under two days.",
    results: [
      { value: "48h", label: "Time to launch before peak season" },
      { value: "+29%", label: "Direct bookings in first month live" },
      { value: "0", label: "Developer hours needed after launch" },
    ],
    liveDemoUrl: "https://demo.matthewstudio.com/solstice-villas",
    tags: ["Managed SaaS", "Adults-Only", "Fast Launch"],
  },
];

/**
 * getPortfolioProjectBySlug
 * Looks up a single case study by its URL slug. Returns undefined when
 * no match exists so the calling page can call notFound().
 */
export function getPortfolioProjectBySlug(slug: string): PortfolioProject | undefined {
  return PORTFOLIO_PROJECTS.find((project) => project.slug === slug);
}
