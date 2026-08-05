/**
 * FILE: lib/pricingData.ts
 * PURPOSE:
 * Static placeholder pricing data for the Template Shop (/shop). The
 * three tiers correspond directly to the tags already used on the
 * Portfolio case studies (lib/portfolioData.ts): "Managed SaaS",
 * "Self-Hosted", and "Custom Build" — so a visitor reading a case
 * study and clicking through to /shop sees consistent tier naming.
 *
 * DATA FLOW:
 * No database yet — replace with a superAdmin-managed `pricingTiers`
 * table once the admin dashboard is built (see overviewProject.txt).
 */

export interface PricingTier {
  slug: string;
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    slug: "managed-saas",
    name: "Managed SaaS",
    price: "$149",
    priceSuffix: "/month",
    description:
      "The fastest way live. We host it, patch it, and back it up — you manage content from the super-admin dashboard.",
    features: [
      "Live in 48 hours",
      "Hosting, updates & backups included",
      "Multi-room booking with real-time availability",
      "Promo codes & seasonal pricing",
      "Super-admin dashboard, no code needed",
      "Email support",
    ],
    ctaLabel: "Get Started",
  },
  {
    slug: "self-hosted",
    name: "Self-Hosted",
    price: "$2,400",
    priceSuffix: "one-time",
    description:
      "Full source-code ownership on your own infrastructure, with your brand baked in from day one.",
    features: [
      "Full source code, yours to keep",
      "Deployed on your own hosting",
      "Custom color palette & typography",
      "Multi-room booking with real-time availability",
      "Promo codes & seasonal pricing",
      "30 days of setup support",
    ],
    ctaLabel: "Get Started",
    highlighted: true,
  },
  {
    slug: "custom-build",
    name: "Custom Build",
    price: "Starting at $6,000",
    priceSuffix: "retainer",
    description:
      "For resorts that need something the template doesn't do out of the box — add-on packages, integrations, custom flows.",
    features: [
      "Everything in Self-Hosted",
      "Custom booking flows & add-on packages",
      "Third-party integrations (PMS, payments, SMS)",
      "Dedicated build timeline",
      "Ongoing retainer support",
    ],
    ctaLabel: "Book a Call",
  },
];

/**
 * getPricingTierBySlug
 * Looks up a single pricing tier by its slug — used when a CTA needs
 * to pre-select a tier on the Contact page (future work item 8).
 */
export function getPricingTierBySlug(slug: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.slug === slug);
}
