/**
 * FILE: app/buyer/dashboard/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * First screen a buyer lands on after signing in or registering
 * (login_and_registration_page.md Sections 3.1/3.2/7). Shows a welcome
 * message and the same four quick-start items listed in Section 10's
 * onboarding checklist. Profile and payment method pages don't exist
 * yet, so those two cards are shown as upcoming rather than dead links.
 * OnboardingModal (client) additionally renders the Section 10 welcome
 * overlay itself, but only right after registration — see that
 * component's header comment for how it detects a fresh signup.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, GraduationCap, UserRound, CreditCard } from "lucide-react";
import OnboardingModal from "@/components/buyer/OnboardingModal";

export const metadata: Metadata = {
  title: "Dashboard | Matthew Studio",
  description: "Your Matthew Studio buyer account.",
};

const QUICK_LINKS = [
  {
    title: "Browse templates",
    description: "See the full catalog of resort booking templates and pricing tiers.",
    href: "/shop",
    icon: ShoppingBag,
    available: true,
  },
  {
    title: "Explore tutorials",
    description: "Guides and walkthroughs for getting the most out of your template.",
    href: "/tutorials",
    icon: GraduationCap,
    available: true,
  },
  {
    title: "Complete your profile",
    description: "Add your details so orders and support requests are pre-filled.",
    href: "#",
    icon: UserRound,
    available: false,
  },
  {
    title: "Add payment method",
    description: "Save a card so checkout is one click next time.",
    href: "#",
    icon: CreditCard,
    available: false,
  },
];

export default function BuyerDashboardPage() {
  return (
    <section className="buyerDashboard">
      <OnboardingModal />
      <div className="buyerDashboardHeader">
        <p className="buyerDashboardEyebrow">Buyer dashboard</p>
        <h1 className="buyerDashboardTitle">Welcome to Matthew Studio</h1>
        <p className="buyerDashboardSubtitle">
          Here&apos;s where to start — pick up any of these whenever you&apos;re ready.
        </p>
      </div>

      <div className="buyerQuickLinkGrid">
        {QUICK_LINKS.map(({ title, description, href, icon: Icon, available }) => {
          const card = (
            <article
              key={title}
              className={`buyerQuickLinkCard ${available ? "" : "buyerQuickLinkCard--soon"}`}
            >
              <span className="buyerQuickLinkIcon">
                <Icon size={20} />
              </span>
              <h2 className="buyerQuickLinkTitle">{title}</h2>
              <p className="buyerQuickLinkDescription">{description}</p>
              {!available && <span className="buyerQuickLinkBadge">Coming soon</span>}
            </article>
          );

          return available ? (
            <Link key={title} href={href} className="buyerQuickLinkWrapper">
              {card}
            </Link>
          ) : (
            <div key={title} className="buyerQuickLinkWrapper" aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
