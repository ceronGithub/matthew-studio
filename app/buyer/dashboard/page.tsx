/**
 * FILE: app/buyer/dashboard/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * First screen a buyer lands on after signing in or registering
 * (login_and_registration_page.md Sections 3.1/3.2/7). Shows a welcome
 * message and quick-start items from Section 10's onboarding
 * checklist plus Orders (buyer_order_tracking_specification.md,
 * added 2026-09-06). Payment method page doesn't exist yet, so that
 * card is shown as upcoming rather than a dead link.
 * OnboardingModal (client) additionally renders the Section 10 welcome
 * overlay itself, but only right after registration — see that
 * component's header comment for how it detects a fresh signup.
 *
 * Per buyer_homepage_specification.md §13.2, the header and the
 * quick-link cards below now have a mount-in entrance (fade/scale-in)
 * instead of a static render — DashboardHeaderReveal and QuickLinkGrid
 * own that motion so this page itself can stay a Server Component.
 */
import type { Metadata } from "next";
import OnboardingModal from "@/components/buyer/OnboardingModal";
import DashboardHeaderReveal from "@/components/buyer/DashboardHeaderReveal";
import QuickLinkGrid, { type QuickLinkItem } from "@/components/buyer/QuickLinkGrid";

export const metadata: Metadata = {
  title: "Dashboard | Matthew Studio",
  description: "Your Matthew Studio buyer account.",
};

const QUICK_LINKS: QuickLinkItem[] = [
  {
    title: "Browse templates",
    description: "See the full catalog of resort booking templates and pricing tiers.",
    href: "/shop",
    icon: "shopping-bag",
    available: true,
  },
  {
    title: "Explore tutorials",
    description: "Guides and walkthroughs for getting the most out of your template.",
    href: "/tutorials",
    icon: "graduation-cap",
    available: true,
  },
  {
    title: "Your downloads",
    description: "Templates, file tools, and license keys you've purchased.",
    href: "/buyer/downloads",
    icon: "download",
    available: true,
  },
  {
    title: "Your orders",
    description: "See every order you've placed and track t-shirt production.",
    href: "/buyer/orders",
    icon: "package",
    available: true,
  },
  {
    title: "Complete your profile",
    description: "Add your details so orders and support requests are pre-filled.",
    href: "/buyer/profile",
    icon: "user-round",
    available: true,
  },
  {
    title: "Add payment method",
    description: "Save a card so checkout is one click next time.",
    href: "#",
    icon: "credit-card",
    available: false,
  },
];

export default function BuyerDashboardPage() {
  return (
    <section className="buyerDashboard">
      <OnboardingModal />
      <DashboardHeaderReveal>
        <div className="buyerDashboardHeader">
          <p className="buyerDashboardEyebrow">Buyer dashboard</p>
          <h1 className="buyerDashboardTitle">Welcome to Matthew Studio</h1>
          <p className="buyerDashboardSubtitle">
            Here&apos;s where to start — pick up any of these whenever you&apos;re ready.
          </p>
        </div>
      </DashboardHeaderReveal>

      <QuickLinkGrid links={QUICK_LINKS} />
    </section>
  );
}
