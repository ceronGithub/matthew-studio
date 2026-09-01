/**
 * FILE: lib/featuresData.ts
 * PURPOSE:
 * Static placeholder content for the "Why Choose Matthew Studio" page
 * (/features): the tech stack breakdown, the out-of-the-box feature
 * list, and the comparison table vs. DIY/from-scratch or a generic
 * marketplace. Generalized to the marketplace as a whole — not any
 * single category — per improvement_1.md Section 3.
 *
 * DATA FLOW:
 * No database yet — this is static content, same pattern as
 * lib/pricingData.ts and lib/portfolioData.ts, pending a
 * superAdmin-managed content table if this ever needs to change
 * without a code deploy.
 */

export interface TechStackItem {
  name: string;
  role: string;
}

export const TECH_STACK: TechStackItem[] = [
  { name: "Next.js", role: "App Router, server rendering, and API routes in one framework" },
  { name: "TypeScript", role: "Every file type-checked before it ships — fewer runtime surprises" },
  { name: "Supabase", role: "Managed Postgres, auth, and row-level security out of the box" },
  { name: "Tailwind CSS", role: "Consistent design tokens, fast to restyle for your brand" },
  { name: "Cloudflare R2", role: "CDN-backed asset storage — product images and files load fast worldwide" },
  { name: "Vercel", role: "One-click deploys, automatic previews on every change" },
];

export interface IncludedFeature {
  title: string;
  description: string;
}

export const INCLUDED_FEATURES: IncludedFeature[] = [
  {
    title: "Fast delivery, every category",
    description: "From instant digital downloads to a live site in days — no open-ended timelines.",
  },
  {
    title: "Built for every category",
    description: "Templates, apparel, AI videos, file tools, tutorials, and game characters — one platform.",
  },
  {
    title: "Direct support, not a ticket queue",
    description: "Reach the team that actually built what you bought — no outsourced support desk.",
  },
  {
    title: "Mobile-first design",
    description: "Every page works cleanly from a 375px phone screen up to a 27-inch display.",
  },
  {
    title: "Security built in",
    description: "Rate limiting, RLS policies, and audit logging ship with every product tier.",
  },
  {
    title: "SEO-ready pages",
    description: "Metadata, Open Graph tags, and fast load times so search engines find you.",
  },
];

export interface ComparisonRow {
  criteria: string;
  template: string;
  fromScratch: string;
  genericBuilder: string;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    criteria: "Time to get it",
    template: "Same day – 2 weeks, by category",
    fromScratch: "Weeks to months",
    genericBuilder: "Instant, but generic",
  },
  {
    criteria: "Made for your use case",
    template: "Yes, category-specific work",
    fromScratch: "Yes, but you build it all",
    genericBuilder: "Rarely — one-size-fits-all",
  },
  {
    criteria: "Ownership",
    template: "Yes — files/assets are yours",
    fromScratch: "Yes",
    genericBuilder: "Often licensed, not owned",
  },
  {
    criteria: "Ongoing cost",
    template: "One-time or low monthly, by category",
    fromScratch: "Varies, often higher",
    genericBuilder: "Subscription lock-in common",
  },
  {
    criteria: "Direct support",
    template: "Yes, from the team that built it",
    fromScratch: "None — you're on your own",
    genericBuilder: "Ticket queue, slow turnaround",
  },
];
