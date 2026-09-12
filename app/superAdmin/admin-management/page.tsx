/**
 * FILE: app/superAdmin/admin-management/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * Completes task-96 (UI half): the list page for
 * super_admin_account_specification.md Section 3.2.1. Stays a Server
 * Component per Rule 31.1 — all fetching and interactivity lives in
 * the client-only AdminManagementList below it, same split as
 * app/superAdmin/security-logs/page.tsx.
 */
import type { Metadata } from "next";
import AdminManagementList from "@/components/admin/AdminManagementList";
import "../../styles/adminManagement.css";

export const metadata: Metadata = {
  title: "Admin Management | Matthew Studio Admin",
  description: "View, create, and manage admin accounts and their permissions.",
};

export default function SuperAdminAdminManagementPage() {
  return (
    <section className="adminManagementPage">
      <div className="adminManagementPageHeader">
        <p className="adminManagementPageEyebrow">Super-Admin</p>
        <h1 className="adminManagementPageTitle">Admin Management</h1>
        <p className="adminManagementPageSubtitle">
          View and manage every admin account — status, permissions, and access.
        </p>
      </div>

      <AdminManagementList />
    </section>
  );
}
