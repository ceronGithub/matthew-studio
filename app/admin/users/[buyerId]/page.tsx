/**
 * FILE: app/admin/users/[buyerId]/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Buyer Details page (task-88, admin_account_specification.md
 * Section 3.4.2). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * AdminUserDetail below it, same split as
 * app/admin/orders/[orderId]/page.tsx.
 */
import type { Metadata } from "next";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import "../../../styles/adminUserDetail.css";

export const metadata: Metadata = {
  title: "Buyer Detail | Matthew Studio Admin",
  description: "View and manage a single buyer account.",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;

  return (
    <section className="adminUserDetailPage">
      <AdminUserDetail buyerId={buyerId} />
    </section>
  );
}
