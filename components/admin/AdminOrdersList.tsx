/**
 * FILE: components/admin/AdminOrdersList.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/orders/page.tsx.
 *
 * PURPOSE:
 * Order list page (task-80, admin_account_specification.md Section
 * 3.3.1): every order across every buyer, newest first, with status/
 * date-range/search filters, checkbox row selection + a bulk status
 * update bar, a CSV export button, and per-row "View" navigation to
 * the order detail page (task-81 — route exists here so this page
 * ships ready for it, even before that page is built). Handles all
 * three required data states (Rule 25): loading skeleton, empty
 * state, and error state with retry.
 *
 * Reuses lib/orderStatus.ts's label/color mapping so the badge colors
 * match the buyer-facing order pages exactly, and the shared
 * ConfirmationModal (Rule 34.4) before applying a bulk status change,
 * since it affects multiple orders at once.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, PackageSearch } from "lucide-react";
import { useAdminOrders } from "@/lib/hooks/useAdminOrders";
import { getOrderStatusDisplay } from "@/lib/orderStatus";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const STATUS_OPTIONS = ["pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrdersList() {
  const {
    orders,
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
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    exportCsv,
    bulkUpdateStatus,
  } = useAdminOrders();

  const { toasts, showToast, dismissToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [bulkStatusChoice, setBulkStatusChoice] = useState(STATUS_OPTIONS[0]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    const result = await exportCsv();
    setIsExporting(false);
    if (result.success) {
      showToast("✓ Orders exported to CSV.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleBulkConfirm() {
    const { succeeded, failed } = await bulkUpdateStatus(bulkStatusChoice);
    setIsBulkModalOpen(false);
    if (failed === 0) {
      showToast(`✓ ${succeeded} order${succeeded === 1 ? "" : "s"} updated to "${bulkStatusChoice}".`, "success");
    } else if (succeeded === 0) {
      showToast("✕ Failed to update the selected orders.", "error");
    } else {
      showToast(`⚠ ${succeeded} updated, ${failed} failed. Check the list below.`, "warning");
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminOrdersToolbar">
        <div className="adminOrdersFilters">
          <select
            className="adminOrdersFilterSelect"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="adminOrdersFilterInput"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            aria-label="From date"
          />
          <input
            type="date"
            className="adminOrdersFilterInput"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            aria-label="To date"
          />

          <input
            type="search"
            className="adminOrdersFilterInput adminOrdersSearchInput"
            placeholder="Search order ID or guest email…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search orders"
          />

          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <button type="button" className="adminOrdersClearFiltersButton" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <button
          type="button"
          className="adminOrdersExportButton"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download size={16} />
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="adminOrdersBulkBar">
          <span className="adminOrdersBulkCount">{selectedIds.size} selected</span>
          <select
            className="adminOrdersFilterSelect"
            value={bulkStatusChoice}
            onChange={(e) => setBulkStatusChoice(e.target.value)}
            aria-label="Bulk status to apply"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" className="adminOrdersBulkApplyButton" onClick={() => setIsBulkModalOpen(true)}>
            Apply status
          </button>
          <button type="button" className="adminOrdersBulkClearButton" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="adminOrdersGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="adminOrdersRow adminOrdersRow--skeleton">
              <div className="adminOrdersSkeletonLine skeletonBlock" />
              <div className="adminOrdersSkeletonLine skeletonBlock adminOrdersSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="adminOrdersEmptyState">
          <PackageSearch size={32} />
          <p>{error}</p>
          <button type="button" className="adminOrdersRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="adminOrdersEmptyState">
          <PackageSearch size={32} />
          <p>No orders match these filters.</p>
        </div>
      ) : (
        <>
          <div className="adminOrdersTableWrapper">
            <table className="adminOrdersTable">
              <thead>
                <tr>
                  <th className="adminOrdersCheckboxCell">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === orders.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all orders on this page"
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Buyer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th className="adminOrdersActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusDisplay = getOrderStatusDisplay(order.status);
                  return (
                    <tr key={order.id} className={selectedIds.has(order.id) ? "adminOrdersTableRow--selected" : ""}>
                      <td className="adminOrdersCheckboxCell">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </td>
                      <td className="adminOrdersIdCell">#{order.id.slice(-8)}</td>
                      <td>{order.buyerEmail ?? "Unknown buyer"}</td>
                      <td>{formatPeso(order.total)}</td>
                      <td>
                        <span
                          className="adminOrdersStatusBadge"
                          style={{ color: `var(${statusDisplay.colorVar})` }}
                        >
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td className="adminOrdersPaymentCell">{order.paymentStatus ?? "—"}</td>
                      <td>{formatOrderDate(order.createdAt)}</td>
                      <td className="adminOrdersActionsCell">
                        <Link href={`/admin/orders/${order.id}`} className="adminOrdersViewLink">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="adminOrdersFooter">
            <span className="adminOrdersTotalCount">{totalCount} total order{totalCount === 1 ? "" : "s"}</span>

            {totalPages > 1 && (
              <div className="adminOrdersPagination">
                <button
                  type="button"
                  className="adminOrdersPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="adminOrdersPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="adminOrdersPageButton"
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
        isOpen={isBulkModalOpen}
        title="Update order status?"
        description={`Are you sure you want to set ${selectedIds.size} selected order${
          selectedIds.size === 1 ? "" : "s"
        } to "${bulkStatusChoice}"? Each buyer with an account will be notified.`}
        confirmLabel="Update status"
        onConfirm={handleBulkConfirm}
        onCancel={() => setIsBulkModalOpen(false)}
      />
    </>
  );
}
