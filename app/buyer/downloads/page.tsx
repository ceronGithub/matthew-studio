/**
 * FILE: app/buyer/downloads/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Downloads & License Delivery (buyer_account_specification.md
 * Section 4.1) — priority #1 of the new buyer-account pages, since
 * buyers can already pay for digital products but had no page that
 * hands over what they bought. Stays a Server Component per Rule
 * 31.1; all data fetching and interactivity lives in the client-only
 * DownloadsList below it.
 */
import type { Metadata } from "next";
import DownloadsList from "@/components/buyer/DownloadsList";
import "../../styles/buyerDownloads.css";

export const metadata: Metadata = {
  title: "Downloads | Matthew Studio",
  description: "Your purchased templates, file tools, and license keys.",
};

export default function BuyerDownloadsPage() {
  return (
    <section className="buyerDownloadsPage">
      <div className="buyerDownloadsHeader">
        <p className="buyerDownloadsEyebrow">Buyer dashboard</p>
        <h1 className="buyerDownloadsTitle">Downloads</h1>
        <p className="buyerDownloadsSubtitle">Everything you&apos;ve purchased, ready whenever you need it.</p>
      </div>

      <DownloadsList />
    </section>
  );
}
