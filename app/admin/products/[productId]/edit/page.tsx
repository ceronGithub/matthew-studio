/**
 * FILE: app/admin/products/[productId]/edit/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts.
 *
 * PURPOSE:
 * Edit-product form (Task 23, admin_account_specification.md Section
 * 3.2.2). Stays a Server Component per Rule 31.1; all data fetching
 * (loading the existing product) and the PUT submit live in the
 * client-only AdminProductForm, given this route's productId so
 * useAdminProductForm knows to load + PUT rather than POST.
 */
import type { Metadata } from "next";
import AdminProductForm from "@/components/admin/AdminProductForm";
import "../../../../styles/adminProductForm.css";

export const metadata: Metadata = {
  title: "Edit product | Matthew Studio Admin",
  description: "Update this product's details.",
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <section className="adminProductFormPage">
      <div className="adminProductFormHeader">
        <p className="adminProductFormEyebrow">Admin</p>
        <h1 className="adminProductFormTitle">Edit product</h1>
        <p className="adminProductFormSubtitle">Update the details below and save your changes.</p>
      </div>

      <AdminProductForm productId={productId} />
    </section>
  );
}
