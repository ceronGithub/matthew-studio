/**
 * FILE: components/admin/AdminProductsList.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/products/page.tsx.
 *
 * PURPOSE:
 * Product list (Task 22, admin_account_specification.md Section
 * 3.2.1): every product, newest first, with category/status filter
 * dropdowns and a search box. Handles all three required data states
 * (Rule 25): loading skeleton, empty state, and error state with
 * retry. Edit links to /admin/products/[productId]/edit (Task 23);
 * Delete runs behind the shared ConfirmationModal (Rule 34.4) since
 * it's a soft-delete but still an irreversible-from-the-UI action.
 * Bulk actions and CSV export (Section 3.2.1) are deferred — noted
 * in docs/tasks/task-22-ui-admin-products-list.md, not built here.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { useAdminProducts } from "@/lib/hooks/useAdminProducts";
import { CATEGORY_LABELS } from "@/lib/adminProductValidation";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const CATEGORY_FILTERS = [{ value: "all", label: "All categories" }, ...Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)];

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminProductsList() {
  const {
    products,
    totalPages,
    page,
    isLoading,
    error,
    category,
    status,
    search,
    setCategory,
    setStatus,
    setSearch,
    goToPage,
    refetch,
    deleteProduct,
  } = useAdminProducts();

  const { toasts, showToast, dismissToast } = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDeleteProduct = products.find((product) => product.id === pendingDeleteId) ?? null;

  async function handleDeleteConfirm() {
    if (!pendingDeleteId) return;
    const result = await deleteProduct(pendingDeleteId);
    setPendingDeleteId(null);
    showToast(result.success ? "✓ Product deleted." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminProductsToolbar">
        <input
          type="search"
          className="adminProductsSearchInput"
          placeholder="Search products…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search products"
        />

        <select
          className="adminProductsFilterSelect"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="adminProductsFilterSelect"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Link href="/admin/products/create" className="adminProductsCreateButton">
          <Plus size={16} />
          New product
        </Link>
      </div>

      {isLoading ? (
        <div className="adminProductsGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="adminProductsRow adminProductsRow--skeleton">
              <div className="adminProductsSkeletonLine skeletonBlock" />
              <div className="adminProductsSkeletonLine skeletonBlock adminProductsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="adminProductsEmptyState">
          <Package size={32} />
          <p>{error}</p>
          <button type="button" className="adminProductsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="adminProductsEmptyState">
          <Package size={32} />
          <p>No products match these filters.</p>
        </div>
      ) : (
        <>
          <div className="adminProductsGrid">
            {products.map((product) => (
              <div key={product.id} className="adminProductsRow">
                <div className="adminProductsRowMain">
                  <h2 className="adminProductsName">{product.name}</h2>
                  <p className="adminProductsCategory">{product.categoryLabel}</p>
                </div>

                <div className="adminProductsRowMeta">
                  <span
                    className={`adminProductsStatusBadge adminProductsStatusBadge--${product.status}`}
                  >
                    {product.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span className="adminProductsPrice">{formatPeso(product.startingPrice)}</span>
                  <span className="adminProductsDate">{formatDate(product.updatedAt)}</span>
                </div>

                <div className="adminProductsRowActions">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="adminProductsIconButton"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="adminProductsIconButton adminProductsIconButton--danger"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => setPendingDeleteId(product.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="adminProductsPagination">
              <button
                type="button"
                className="adminProductsPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="adminProductsPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="adminProductsPageButton"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={pendingDeleteProduct !== null}
        title="Delete product?"
        description={`Are you sure you want to delete "${pendingDeleteProduct?.name}"? This removes it from the shop immediately.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
