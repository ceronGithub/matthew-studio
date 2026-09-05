/**
 * FILE: app/buyer/support/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Support Tickets list + new-ticket form (Task 09,
 * buyer_account_specification.md Section 4.5). Stays a Server
 * Component per Rule 31.1; all data fetching and interactivity lives
 * in the client-only SupportTicketsList below it. Reads an optional
 * ?orderId= search param so the not-yet-built Task 10 change to
 * OrderTrackingDetail.tsx's "Contact Support" button only needs to
 * change its href, not this page.
 */
import type { Metadata } from "next";
import SupportTicketsList from "@/components/buyer/SupportTicketsList";
import "../../styles/buyerSupport.css";

export const metadata: Metadata = {
  title: "Support | Matthew Studio",
  description: "Your support ticket history and new requests.",
};

export default async function BuyerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return (
    <section className="buyerSupportPage">
      <div className="buyerSupportHeader">
        <p className="buyerSupportEyebrow">Buyer dashboard</p>
        <h1 className="buyerSupportTitle">Support</h1>
        <p className="buyerSupportSubtitle">Open a ticket and we&apos;ll follow up here — every reply stays on this page.</p>
      </div>

      <SupportTicketsList prefillOrderId={orderId ?? null} />
    </section>
  );
}
