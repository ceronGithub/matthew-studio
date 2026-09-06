/**
 * FILE: app/admin/support/[ticketId]/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Ticket detail thread + reply + close (Task 18,
 * admin_support_ticket_specification.md Sections 2/5). Stays a
 * Server Component per Rule 31.1; all data fetching, mutations, and
 * interactivity live in the client-only AdminSupportTicketDetail
 * below it.
 */
import type { Metadata } from "next";
import AdminSupportTicketDetail from "@/components/admin/AdminSupportTicketDetail";
import "../../../styles/adminSupport.css";
import "../../../styles/buyerSupport.css";

export const metadata: Metadata = {
  title: "Ticket detail | Matthew Studio Admin",
  description: "Reply to or close a buyer support ticket.",
};

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  return (
    <section className="adminSupportPage">
      <AdminSupportTicketDetail ticketId={ticketId} />
    </section>
  );
}
