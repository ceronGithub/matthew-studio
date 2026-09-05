/**
 * FILE: app/buyer/support/[ticketId]/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Support Ticket detail thread (Task 10,
 * buyer_account_specification.md Section 4.5). Stays a Server
 * Component per Rule 31.1; all data fetching and interactivity lives
 * in the client-only SupportTicketThread below it.
 */
import type { Metadata } from "next";
import SupportTicketThread from "@/components/buyer/SupportTicketThread";
import "../../../styles/buyerSupport.css";

export const metadata: Metadata = {
  title: "Support Ticket | Matthew Studio",
  description: "Your support ticket conversation.",
};

export default async function BuyerSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  return (
    <section className="buyerSupportPage">
      <SupportTicketThread ticketId={ticketId} />
    </section>
  );
}
