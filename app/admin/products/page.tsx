/**
 * FILE: app/admin/products/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Product list (Task 22, admin_account_specification.md Section
 * 3.2.1). Stays a Server Component per Rule 31.1; all data fetching
 * and interactivity lives in the client-only AdminProductsList below
 * it, same split as app/admin/support/page.tsx.
 */
import type { Metadata } from "next";
import AdminProductsList from "@/components/admin/AdminProductsList";
import "../../styles/adminProducts.css";

export const metadata: Metadata = {
  title: "Products | Matthew Studio Admin",
  description: "Every product in the shop, newest activity first.",
};

export default function AdminProductsPage() {
  return (
    <section className="adminProductsPage">
      <div className="adminProductsHeader">
        <p className="adminProductsEyebrow">Admin</p>
        <h1 className="adminProductsTitle">Products</h1>
        <p className="adminProductsSubtitle">Create, edit, and manage every product in the shop.</p>
      </div>

      <AdminProductsList />
    </section>
  );
}
