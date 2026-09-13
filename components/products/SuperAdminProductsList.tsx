/**
 * FILE: components/products/SuperAdminProductsList.tsx
 * ROLE: Super-admin only — rendered inside
 * app/superAdmin/products/page.tsx.
 *
 * PURPOSE:
 * task-112, super_admin_account_specification.md Section 9.2: every
 * product, filterable by status (defaults to "Pending Review" per
 * the spec's own filter callout), with Approve/Reject row actions.
 * Handles all three required data states (Rule 25): loading
 * skeleton, empty state, error state with retry. Mirrors
 * components/buyer-management/BuyerManagementList.tsx's structure.
 *
 * Approve fires immediately (no confirmation modal) — matches
 * task-108's precedent for non-destructive status changes toasting
 * without a modal gate. Reject goes through the shared
 * ConfirmationModal (Rule 34.4), naming the product by title.
 */
"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { useState } from "react";
import { useSuperAdminProducts } from "@/lib/hooks/useSuperAdminProducts";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  "pending-review": "var(--color-warning)",
  draft: "var(--color-text-muted)",
  published: "var(--color-success)",
};

const STATUS_LABELS: Record<string, string> = {
  "pending-review": "Pending Review",
  draft: "Draft",
  published: "Published",
};

// Which single-row action is pending confirmation. Approve has no
// pending state — it fires immediately from handleApprove.
type PendingRowAction = { productId: string; name: string } | null;

export default function SuperAdminProductsList() {
  const {
    products,
    totalPages,
    totalCount,
    page,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
    approveProduct,
    rejectProduct,
  } = useSuperAdminProducts();

  const { toasts, showToast, dismissToast } = useToast();
  const [pendingReject, setPendingReject] = useState<PendingRowAction>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function handleApprove(productId: string, name: string) {
    setApprovingId(productId);
    const result = await approveProduct(productId);
    setApprovingId(null);
    if (result.success) {
      showToast(`✓ Product "${name}" approved and now live.`, "success");
    } else {
      showToast(`✕ ${result.message ?? "Failed to approve this product."}`, "error");
    }
  }

  async function handleRejectConfirm() {
    if (!pendingReject) return;
    const result = await rejectProduct(pendingReject.productId);
    const name = pendingReject.name;
    setPendingReject(null);
    if (result.success) {
      showToast(`✓ Product "${name}" has been rejected.`, "success");
    } else {
      showToast(`✕ ${result.message ?? "Failed to reject this product."}`, "error");
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="superAdminProductsToolbar">
        <div className="superAdminProductsFilters">
          <select
            className="superAdminProductsFilterSelect"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="pending-review">Pending Review</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="">All statuses</option>
          </select>

          <input
            type="search"
            className="superAdminProductsFilterInput superAdminProductsSearchInput"
            placeholder="Search product name…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search products"
          />

          {(filters.status !== "pending-review" || filters.search) && (
            <button type="button" className="superAdminProductsClearFiltersButton" onClick={clearFilters}>
              Reset to Pending Review
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="superAdminProductsGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="superAdminProductsRow--skeleton">
              <div className="superAdminProductsSkeletonLine skeletonBlock" />
              <div className="superAdminProductsSkeletonLine skeletonBlock superAdminProductsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="superAdminProductsEmptyState">
          <PackageSearch size={32} />
          <p>{error}</p>
          <button type="button" className="superAdminProductsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="superAdminProductsEmptyState">
          <PackageSearch size={32} />
          <p>
            {filters.status === "pending-review"
              ? "No products are awaiting review."
              : "No products match these filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="superAdminProductsTableWrapper">
            <table className="superAdminProductsTable">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Submitted By</th>
                  <th>Last Updated</th>
                  <th className="superAdminProductsActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="superAdminProductsNameCell">{product.name}</td>
                    <td>{product.categoryLabel}</td>
                    <td>{formatPeso(product.startingPrice)}</td>
                    <td>
                      <span
                        className="superAdminProductsStatusBadge"
                        style={{ color: STATUS_COLORS[product.status] ?? "var(--color-text-secondary)" }}
                      >
                        {STATUS_LABELS[product.status] ?? product.status}
                      </span>
                    </td>
                    <td>{product.createdBy ?? "—"}</td>
                    <td>{formatDate(product.updatedAt)}</td>
                    <td className="superAdminProductsActionsCell">
                      {product.status === "pending-review" ? (
                        <div className="superAdminProductsRowActions">
                          <button
                            type="button"
                            className="superAdminProductsActionButton"
                            onClick={() => handleApprove(product.id, product.name)}
                            disabled={approvingId === product.id}
                          >
                            {approvingId === product.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="superAdminProductsActionButton superAdminProductsActionButton--danger"
                            onClick={() => setPendingReject({ productId: product.id, name: product.name })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="superAdminProductsNoActions">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="superAdminProductsFooter">
            <span className="superAdminProductsTotalCount">
              {totalCount} total product{totalCount === 1 ? "" : "s"}
            </span>

            {totalPages > 1 && (
              <div className="superAdminProductsPagination">
                <button
                  type="button"
                  className="superAdminProductsPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="superAdminProductsPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="superAdminProductsPageButton"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={pendingReject !== null}
        title="Reject product?"
        description={`Are you sure you want to reject "${pendingReject?.name ?? ""}"? It will return to draft so the admin can revise and resubmit.`}
        confirmLabel="Reject"
        onConfirm={handleRejectConfirm}
        onCancel={() => setPendingReject(null)}
      />
    </>
  );
}
