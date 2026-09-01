/**
 * FILE: lib/howItWorksData.ts
 * PURPOSE:
 * Static placeholder onboarding-flow content for the "How It Works"
 * page (/how-it-works). Scoped to the Templates category only — one
 * ordered step list per Templates pricing tier, keyed by the same
 * `slug` values used in lib/pricingData.ts so the tab labels and CTA
 * links stay consistent with /templates. The marketplace-wide flow
 * (Browse → Choose → Start, covering every category) lives separately
 * on the homepage — see lib/howItWorksHomeData.ts.
 *
 * DATA FLOW:
 * No database yet — static content, same pattern as pricingData.ts,
 * portfolioData.ts, and featuresData.ts, pending superAdmin-managed
 * content.
 */

export interface OnboardingStep {
  title: string;
  description: string;
  duration: string;
}

export interface OnboardingFlow {
  tierSlug: string;
  tierName: string;
  totalTimeline: string;
  steps: OnboardingStep[];
}

export const ONBOARDING_FLOWS: OnboardingFlow[] = [
  {
    tierSlug: "managed-saas",
    tierName: "Managed SaaS",
    totalTimeline: "Live in 48 hours",
    steps: [
      {
        title: "Sign up & pick a plan",
        description: "Create your account and choose the Managed SaaS tier — no contracts to sign first.",
        duration: "Day 1, morning",
      },
      {
        title: "Customize branding",
        description: "Upload your logo, set your colors, and add your bookable inventory through the super-admin dashboard.",
        duration: "Day 1, afternoon",
      },
      {
        title: "We configure hosting",
        description: "Our team connects your domain and confirms backups, patching, and monitoring are live.",
        duration: "Day 2, morning",
      },
      {
        title: "Review & launch",
        description: "Walk through the live site with us, then flip it public. Bookings can start immediately.",
        duration: "Day 2, afternoon",
      },
    ],
  },
  {
    tierSlug: "self-hosted",
    tierName: "Self-Hosted",
    totalTimeline: "Live in about a week",
    steps: [
      {
        title: "Purchase & receive source code",
        description: "Get the full repository access along with setup documentation.",
        duration: "Day 1",
      },
      {
        title: "Deploy to your hosting",
        description: "Follow the included guide to deploy on your infrastructure of choice.",
        duration: "Days 2–3",
      },
      {
        title: "Connect your Supabase project",
        description: "Point the template at your own database and auth project using the provided env template.",
        duration: "Day 3",
      },
      {
        title: "Customize branding & inventory",
        description: "Apply your color palette and typography, then add what you're taking bookings or orders for.",
        duration: "Days 4–5",
      },
      {
        title: "Go live",
        description: "Point your domain at the deployment and start taking bookings.",
        duration: "Day 6–7",
      },
    ],
  },
  {
    tierSlug: "custom-build",
    tierName: "Custom Build",
    totalTimeline: "Timeline set during scoping",
    steps: [
      {
        title: "Discovery call",
        description: "We walk through your business's booking workflow and identify what the template doesn't cover yet.",
        duration: "Week 1",
      },
      {
        title: "Scope & proposal",
        description: "You get a fixed scope, timeline, and retainer quote for the custom work.",
        duration: "Week 1–2",
      },
      {
        title: "Design & development sprints",
        description: "We build the custom flows and integrations in short, reviewable sprints.",
        duration: "Varies by scope",
      },
      {
        title: "Testing & handoff",
        description: "You test on a staging environment before anything touches production.",
        duration: "Final week",
      },
      {
        title: "Launch & ongoing support",
        description: "We launch together, then stay on retainer for fixes and future additions.",
        duration: "Launch day onward",
      },
    ],
  },
];

/**
 * getOnboardingFlowBySlug
 * Looks up a single onboarding flow by its tier slug — used to default
 * the tab selection when a visitor arrives with a tier already in mind
 * (e.g. from a /shop CTA).
 */
export function getOnboardingFlowBySlug(slug: string): OnboardingFlow | undefined {
  return ONBOARDING_FLOWS.find((flow) => flow.tierSlug === slug);
}
