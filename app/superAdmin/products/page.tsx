/**
 * FILE: app/superAdmin/products/page.tsx
 * ROLE: Super-admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard.
 *
 * PURPOSE:
 * task-112, super_admin_account_specification.md Section 9.2 —
 * super-admin approves or rejects products submitted for review,
 * filter defaulting to "Pending Review". Stays a Server Component
 * per Rule 31.1; all data fetching and interactivity lives in the
 * client-only SuperAdminProductsList below it, same split as every
 * other list page in this app. Distinct from /admin/products
 * (task-22) — the regular admin's own product management page —
 * same relationship as buyer-management (task-107) has to
 * /admin/users. Do not merge the two routes.
 */
import type { Metadata } from "next";
import SuperAdminProductsList from "@/components/products/SuperAdminProductsList";
import "../../styles/superAdminProducts.css";

export const metadata: Metadata = {
  title: "Products | Matthew Studio Super Admin",
  description: "Review products submitted for approval — approve or reject before they go live.",
};

export default function SuperAdminProductsPage() {
  return (
    <section className="superAdminProductsPage">
      <div className="superAdminProductsHeader">
        <p className="superAdminProductsEyebrow">Super Admin</p>
        <h1 className="superAdminProductsTitle">Products</h1>
        <p className="superAdminProductsSubtitle">
          Review products submitted by admins — approve to publish, or reject to send back to draft.
        </p>
      </div>

      <SuperAdminProductsList />
    </section>
  );
}
