/**
 * FILE: lib/howItWorksHomeData.ts
 * PURPOSE:
 * Static content for the homepage's universal 3-step "How It Works"
 * section (Browse → Choose → Start). This is deliberately separate
 * from lib/howItWorksData.ts, which powers the per-tier onboarding
 * timeline on the standalone /how-it-works page — that page walks
 * through the Template product's own signup flow, while this one is
 * the marketplace-wide explainer shown on the homepage for any
 * category (Templates, T-Shirts, AI Videos, etc.).
 *
 * DATA FLOW:
 * Imported by components/home/HowItWorksSection.tsx and rendered as
 * three connected steps.
 */

export interface HowItWorksHomeStep {
  step: number;
  title: string;
  description: string;
  iconName: "search" | "check" | "rocket";
}

export const HOW_IT_WORKS_HOME_STEPS: HowItWorksHomeStep[] = [
  {
    step: 1,
    title: "Browse Products",
    description: "Explore 100+ products across all categories.",
    iconName: "search",
  },
  {
    step: 2,
    title: "Choose What Fits",
    description: "Pick the right variant, design, or tier for you.",
    iconName: "check",
  },
  {
    step: 3,
    title: "Start Using It",
    description: "Get instant access and start creating today.",
    iconName: "rocket",
  },
];
