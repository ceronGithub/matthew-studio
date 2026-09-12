/**
 * FILE: app/superAdmin/buyer-management/page.tsx
 * ROLE: Super-admin only — protected by middleware.ts (role must be
 * "superAdmin").
 *
 * PURPOSE:
 * task-107, super_admin_account_specification.md Section 3.8 —
 * super-admin's own buyer list, distinct route from /admin/users
 * (task-87) even though both read from the same GET /api/admin/users
 * endpoint (already admin+superAdmin accessible — no new API route
 * needed here). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * BuyerManagementList below it, same split as every other list page
 * in this app.
 */
import type { Metadata } from "next";
import BuyerManagementList from "@/components/buyer-management/BuyerManagementList";
import "../../styles/buyerManagement.css";

export const metadata: Metadata = {
  title: "Buyer Management | Matthew Studio Super Admin",
  description: "Every buyer account, newest first — view, deactivate, reset, or delete.",
};

export default function BuyerManagementPage() {
  return (
    <section className="buyerManagementPage">
      <div className="buyerManagementHeader">
        <p className="buyerManagementEyebrow">Super Admin</p>
        <h1 className="buyerManagementTitle">Buyer Management</h1>
        <p className="buyerManagementSubtitle">
          The same buyer controls regular admins have, plus permanent account deletion — super-admin only.
        </p>
      </div>

      <BuyerManagementList />
    </section>
  );
}
