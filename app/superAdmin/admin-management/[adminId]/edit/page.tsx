/**
 * FILE: app/superAdmin/admin-management/[adminId]/edit/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin"); every API route this
 * page calls also self-checks role === "superAdmin" server-side.
 *
 * PURPOSE:
 * Completes task-98 (UI half): the combined Admin Details & Edit page
 * for super_admin_account_specification.md Section 3.2.3. Stays a
 * Server Component per Rule 31.1 — all data fetching and interactivity
 * lives in the client-only AdminManagementDetail below it, same split
 * as app/admin/users/[buyerId]/page.tsx.
 */
import type { Metadata } from "next";
import AdminManagementDetail from "@/components/admin/AdminManagementDetail";
import "../../../../styles/adminManagementDetail.css";

export const metadata: Metadata = {
  title: "Admin Details | Matthew Studio Admin",
  description: "View and edit a single admin account.",
};

export default async function SuperAdminAdminManagementEditPage({
  params,
}: {
  params: Promise<{ adminId: string }>;
}) {
  const { adminId } = await params;

  return (
    <section className="adminManagementDetailPage">
      <AdminManagementDetail adminId={adminId} />
    </section>
  );
}
