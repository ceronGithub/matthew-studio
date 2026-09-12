/**
 * FILE: app/superAdmin/admin-management/create/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin"); POST /api/admin/
 * create-admin also self-checks role === "superAdmin" server-side.
 *
 * PURPOSE:
 * Completes task-97 (UI half): the create-admin form page for
 * super_admin_account_specification.md Section 3.2.2. Stays a Server
 * Component per Rule 31.1 — all state and interactivity lives in the
 * client-only CreateAdminForm below it.
 */
import type { Metadata } from "next";
import CreateAdminForm from "@/components/admin/CreateAdminForm";
import "../../../styles/adminManagementCreate.css";

export const metadata: Metadata = {
  title: "Create Admin | Matthew Studio Admin",
  description: "Create a new admin account and set its permissions.",
};

export default function SuperAdminCreateAdminPage() {
  return (
    <section className="createAdminPage">
      <div className="createAdminPageHeader">
        <p className="createAdminPageEyebrow">Super-Admin</p>
        <h1 className="createAdminPageTitle">Create Admin Account</h1>
        <p className="createAdminPageSubtitle">
          A temporary password will be emailed to the new admin once the account is created.
        </p>
      </div>

      <CreateAdminForm />
    </section>
  );
}
