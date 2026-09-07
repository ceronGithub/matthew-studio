/**
 * FILE: app/admin/users/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Buyer list page (task-87, admin_account_specification.md Section
 * 3.4.1). Stays a Server Component per Rule 31.1; all data fetching
 * and interactivity lives in the client-only AdminUsersList below it,
 * same split as app/admin/orders/page.tsx and app/admin/products/page.tsx.
 */
import type { Metadata } from "next";
import AdminUsersList from "@/components/admin/AdminUsersList";
import "../../styles/adminUsers.css";

export const metadata: Metadata = {
  title: "Users | Matthew Studio Admin",
  description: "Every buyer account, newest first.",
};

export default function AdminUsersPage() {
  return (
    <section className="adminUsersPage">
      <div className="adminUsersHeader">
        <p className="adminUsersEyebrow">Admin</p>
        <h1 className="adminUsersTitle">Users</h1>
        <p className="adminUsersSubtitle">
          View and manage buyer accounts — filter, export, and take action on individual or selected buyers.
        </p>
      </div>

      <AdminUsersList />
    </section>
  );
}
