/**
 * FILE: lib/featuresData.ts
 * PURPOSE:
 * Static placeholder content for the "Why Choose This Template" page
 * (/features): the tech stack breakdown, the out-of-the-box feature
 * list, and the comparison table vs. building from scratch or buying
 * a generic template.
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
  { name: "Cloudflare R2", role: "CDN-backed image storage — room photos load fast worldwide" },
  { name: "Vercel", role: "One-click deploys, automatic previews on every change" },
];

export interface IncludedFeature {
  title: string;
  description: string;
}

export const INCLUDED_FEATURES: IncludedFeature[] = [
  {
    title: "Multi-room booking engine",
    description: "Real-time availability across every room type, no double-bookings.",
  },
  {
    title: "Promo codes & seasonal pricing",
    description: "Run discounts and adjust rates by date range without touching code.",
  },
  {
    title: "Super-admin dashboard",
    description: "Manage rooms, bookings, and content from a single protected area.",
  },
  {
    title: "Mobile-first design",
    description: "Every page works cleanly from a 375px phone screen up to a 27-inch display.",
  },
  {
    title: "Security built in",
    description: "Rate limiting, RLS policies, and audit logging ship with every tier.",
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
    criteria: "Time to launch",
    template: "48 hours – 2 weeks",
    fromScratch: "3–6 months",
    genericBuilder: "1–2 weeks",
  },
  {
    criteria: "Booking engine included",
    template: "Yes, multi-room",
    fromScratch: "Built separately",
    genericBuilder: "Rarely, or bolted-on plugin",
  },
  {
    criteria: "Source code ownership",
    template: "Yes (Self-Hosted & Custom tiers)",
    fromScratch: "Yes",
    genericBuilder: "No, locked to platform",
  },
  {
    criteria: "Ongoing hosting cost",
    template: "$0–$149/mo",
    fromScratch: "Varies, often higher",
    genericBuilder: "$30–$300/mo",
  },
  {
    criteria: "Custom branding",
    template: "Full control",
    fromScratch: "Full control",
    genericBuilder: "Limited to theme options",
  },
];
