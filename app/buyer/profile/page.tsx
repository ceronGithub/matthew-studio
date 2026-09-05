/**
 * FILE: app/buyer/profile/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Profile (buyer_account_specification.md Section 4.2) — priority #3
 * of the new buyer-account pages, small and the dashboard already
 * reserved a UI slot for it. Stays a Server Component per Rule 31.1;
 * all data fetching and interactivity lives in the client-only
 * ProfileForm below it.
 */
import type { Metadata } from "next";
import ProfileForm from "@/components/buyer/ProfileForm";
import "../../styles/buyerProfile.css";

export const metadata: Metadata = {
  title: "Profile | Matthew Studio",
  description: "Manage your account details.",
};

export default function BuyerProfilePage() {
  return (
    <section className="buyerProfilePage">
      <div className="buyerProfileHeader">
        <p className="buyerProfileEyebrow">Buyer dashboard</p>
        <h1 className="buyerProfileTitle">Profile</h1>
        <p className="buyerProfileSubtitle">Keep your details up to date so orders and support requests are pre-filled.</p>
      </div>

      <ProfileForm />
    </section>
  );
}
