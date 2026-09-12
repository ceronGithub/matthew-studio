/**
 * FILE: app/superAdmin/buyer-management/[buyerId]/page.tsx
 * ROLE: Super-admin only — protected by middleware.ts (role must be
 * "superAdmin").
 *
 * PURPOSE:
 * task-108, super_admin_account_specification.md Section 3.8 — buyer
 * detail page on the super-admin's own route tree (distinct from
 * /admin/users/[buyerId], task-88), adding a permanent Delete Account
 * action on top of the same view/deactivate/reactivate/reset actions
 * regular admins already have. Stays a Server Component per Rule
 * 31.1; all data fetching and interactivity lives in the client-only
 * BuyerManagementDetail below it, same split as
 * app/admin/users/[buyerId]/page.tsx.
 */
import type { Metadata } from "next";
import BuyerManagementDetail from "@/components/buyer-management/BuyerManagementDetail";
import "../../../styles/buyerManagementDetail.css";

export const metadata: Metadata = {
  title: "Buyer Detail | Matthew Studio Super Admin",
  description: "View, manage, or permanently delete a single buyer account.",
};

export default async function BuyerManagementDetailPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;

  return (
    <section className="buyerManagementDetailPage">
      <BuyerManagementDetail buyerId={buyerId} />
    </section>
  );
}
