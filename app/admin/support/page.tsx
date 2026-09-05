/**
 * FILE: app/admin/support/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Ticket inbox (Task 17, admin_support_ticket_specification.md
 * Sections 2/5). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * AdminSupportTicketsList below it.
 */
import type { Metadata } from "next";
import AdminSupportTicketsList from "@/components/admin/AdminSupportTicketsList";
import "../../styles/adminSupport.css";

export const metadata: Metadata = {
  title: "Support tickets | Matthew Studio Admin",
  description: "Every buyer support ticket, newest activity first.",
};

export default function AdminSupportPage() {
  return (
    <section className="adminSupportPage">
      <div className="adminSupportHeader">
        <p className="adminSupportEyebrow">Admin</p>
        <h1 className="adminSupportTitle">Support tickets</h1>
        <p className="adminSupportSubtitle">Every buyer&apos;s ticket, newest activity first. Reply from a ticket to notify the buyer.</p>
      </div>

      <AdminSupportTicketsList />
    </section>
  );
}
