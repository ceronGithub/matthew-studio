/**
 * FILE: app/admin/orders/[orderId]/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Order Details page (task-81, admin_account_specification.md
 * Section 3.3.2). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * AdminOrderDetail below it, same split as app/admin/orders/page.tsx.
 */
import type { Metadata } from "next";
import AdminOrderDetail from "@/components/admin/AdminOrderDetail";
import "../../../styles/adminOrderDetail.css";

export const metadata: Metadata = {
  title: "Order Detail | Matthew Studio Admin",
  description: "View and manage a single order.",
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return (
    <section className="adminOrderDetailPage">
      <AdminOrderDetail orderId={orderId} />
    </section>
  );
}
