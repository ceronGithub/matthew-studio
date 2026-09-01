/**
 * FILE: app/(public)/how-it-works/page.tsx
 * ROLE: Public — Templates category onboarding page, served at "/how-it-works".
 *
 * PURPOSE:
 * Shows the step-by-step onboarding flow for each Templates pricing
 * tier as a tabbed timeline (OnboardingFlow). Scoped to the Templates
 * category only — visitors buying from any other category (T-Shirts,
 * AI Videos, File Tools, Tutorials, Game Characters) follow the
 * universal 3-step flow (Browse → Choose → Start) shown on the
 * homepage instead. Defaults to the tier passed via ?tier=[slug] so a
 * visitor clicking through from a /templates or /pricing CTA lands on
 * the flow that matches the tier they were just looking at. Data is
 * static placeholder content from lib/howItWorksData.ts, pending
 * superAdmin-managed content.
 *
 * DATA FLOW:
 * 1. This Server Component reads the `tier` search param (Next.js 16
 *    passes searchParams as a Promise, so it's awaited here).
 * 2. ONBOARDING_FLOWS and the resolved initial slug are passed as
 *    props into the Client Component OnboardingFlow, which owns the
 *    tab-switching state.
 */
import type { Metadata } from "next";
import Link from "next/link";
import "../../styles/how-it-works.css";
import OnboardingFlow from "@/components/how-it-works/OnboardingFlow";
import { ONBOARDING_FLOWS } from "@/lib/howItWorksData";

export const metadata: Metadata = {
  title: "How It Works — Templates | Matthew Studio",
  description:
    "See the exact step-by-step onboarding flow for each Templates pricing tier, from sign-up to a live booking site.",
  openGraph: {
    title: "How It Works — Templates | Matthew Studio",
    description:
      "See the exact step-by-step onboarding flow for each Templates pricing tier, from sign-up to a live booking site.",
    images: ["/og-how-it-works.png"],
  },
};

export default async function HowItWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;

  return (
    <>
      <header className="howItWorksPageHeader">
        <div className="howItWorksPageHeaderInner">
          <p className="eyebrow">How It Works — Templates</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            From sign-up to a live booking site
          </h1>
          <p className="heroSubtitle">
            Every tier gets you live faster than building from scratch. Pick a tier below to see
            exactly what happens, step by step.
          </p>
          <p className="howItWorksScopeNote">
            Shopping a different category? See the{" "}
            <Link href="/#how-it-works-section">3-step marketplace flow</Link> instead — this
            page covers Templates only.
          </p>
        </div>
      </header>

      <OnboardingFlow flows={ONBOARDING_FLOWS} initialSlug={tier} />

      <section className="howItWorksNoteSection">
        <div className="howItWorksNoteInner">
          <p className="howItWorksNoteText">Ready to see what each tier costs?</p>
          <Link href="/pricing" className="buttonPrimary">
            View Pricing
          </Link>
        </div>
      </section>
    </>
  );
}
