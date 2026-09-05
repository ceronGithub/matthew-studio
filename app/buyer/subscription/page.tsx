/**
 * FILE: app/buyer/subscription/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Subscription Management (buyer_account_specification.md Section
 * 4.4) — lets a buyer see their plan/status, link to /pricing for
 * upgrade/downgrade, cancel (effective end of billing period), and
 * view billing history. Stays a Server Component per Rule 31.1; all
 * data fetching and interactivity lives in SubscriptionDetail below
 * it.
 */
import type { Metadata } from "next";
import SubscriptionDetail from "@/components/buyer/SubscriptionDetail";
import "../../styles/buyerSubscription.css";

export const metadata: Metadata = {
  title: "Subscription | Matthew Studio",
  description: "Manage your Matthew Studio subscription and billing.",
};

export default function BuyerSubscriptionPage() {
  return (
    <section className="subscriptionPage">
      <div className="subscriptionHeader">
        <p className="subscriptionEyebrow">Buyer dashboard</p>
        <h1 className="subscriptionTitle">Subscription</h1>
        <p className="subscriptionSubtitle">See your plan, manage billing, and cancel anytime.</p>
      </div>

      <SubscriptionDetail />
    </section>
  );
}
