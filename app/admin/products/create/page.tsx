/**
 * FILE: app/admin/products/create/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts.
 *
 * PURPOSE:
 * Create-product form (Task 23, admin_account_specification.md
 * Section 3.2.2). Stays a Server Component per Rule 31.1; the form
 * itself is the client-only AdminProductForm, given productId={null}
 * so useAdminProductForm knows to POST rather than PUT.
 */
import type { Metadata } from "next";
import AdminProductForm from "@/components/admin/AdminProductForm";
import "../../../styles/adminProductForm.css";

export const metadata: Metadata = {
  title: "New product | Matthew Studio Admin",
  description: "Create a new product for the shop.",
};

export default function AdminCreateProductPage() {
  return (
    <section className="adminProductFormPage">
      <div className="adminProductFormHeader">
        <p className="adminProductFormEyebrow">Admin</p>
        <h1 className="adminProductFormTitle">New product</h1>
        <p className="adminProductFormSubtitle">Fill in the details below to add a product to the shop.</p>
      </div>

      <AdminProductForm productId={null} />
    </section>
  );
}
