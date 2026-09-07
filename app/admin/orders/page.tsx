/**
 * FILE: app/admin/orders/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Order list page (task-80, admin_account_specification.md Section
 * 3.3.1). Stays a Server Component per Rule 31.1; all data fetching
 * and interactivity lives in the client-only AdminOrdersList below
 * it, same split as app/admin/products/page.tsx and
 * app/admin/support/page.tsx.
 */
import type { Metadata } from "next";
import AdminOrdersList from "@/components/admin/AdminOrdersList";
import "../../styles/adminOrders.css";

export const metadata: Metadata = {
  title: "Orders | Matthew Studio Admin",
  description: "Every order across every buyer, newest first.",
};

export default function AdminOrdersPage() {
  return (
    <section className="adminOrdersPage">
      <div className="adminOrdersHeader">
        <p className="adminOrdersEyebrow">Admin</p>
        <h1 className="adminOrdersTitle">Orders</h1>
        <p className="adminOrdersSubtitle">
          Track, filter, and manage every order — update status, issue refunds, and export data.
        </p>
      </div>

      <AdminOrdersList />
    </section>
  );
}
