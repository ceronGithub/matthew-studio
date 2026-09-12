/**
 * FILE: components/buyer-management/BuyerManagementList.tsx
 * ROLE: Super-admin only — rendered inside
 * app/superAdmin/buyer-management/page.tsx.
 *
 * PURPOSE:
 * task-107, super_admin_account_specification.md Section 3.8: every
 * buyer account, newest first, with status/date-range/search filters,
 * a CSV export button, and per-row actions (View Details, Deactivate/
 * Reactivate, Reset Password). Handles all three required data states
 * (Rule 25): loading skeleton, empty state, and error state with
 * retry. Mirrors components/admin/AdminUsersList.tsx's structure and
 * reuses its lib/hooks/useAdminUsers.ts hook as-is (already fetches
 * from the shared admin+superAdmin GET /api/admin/users endpoint —
 * Rule 2's no-duplication principle, no second hook needed).
 *
 * Deliberately narrower than AdminUsersList: Section 3.8's row-action
 * set is View Details / Deactivate-Reactivate / Reset Password /
 * Delete only — no bulk row-selection bar and no Send Email (those
 * are admin_account_specification.md's own /admin/users actions, not
 * part of this spec). Delete Account is intentionally NOT on this
 * page — it lives on the detail page (task-108) alongside its 5-
 * second-delay ConfirmationModal, wired to task-106's API action.
 *
 * "View Details" links to /superAdmin/buyer-management/[buyerId]
 * (task-108) — never /admin/users/[buyerId] — so the super-admin
 * stays inside their own route tree throughout, even though both
 * routes read the same underlying detail data.
 */
"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { useAdminUsers } from "@/lib/hooks/useAdminUsers";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Which single-row action is pending confirmation.
type PendingRowAction =
  | { type: "toggleActive"; userId: string; email: string | null; nextActive: boolean }
  | { type: "resetPassword"; userId: string; email: string | null }
  | null;

export default function BuyerManagementList() {
  const {
    buyers,
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
    exportCsv,
    setActive,
    resetPassword,
  } = useAdminUsers();

  const { toasts, showToast, dismissToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [pendingRowAction, setPendingRowAction] = useState<PendingRowAction>(null);

  async function handleExport() {
    setIsExporting(true);
    const result = await exportCsv();
    setIsExporting(false);
    if (result.success) {
      showToast("✓ Buyers exported to CSV.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleRowActionConfirm() {
    if (!pendingRowAction) return;
    if (pendingRowAction.type === "toggleActive") {
      const result = await setActive(pendingRowAction.userId, pendingRowAction.nextActive);
      setPendingRowAction(null);
      if (result.success) {
        showToast(`✓ Buyer account ${pendingRowAction.nextActive ? "reactivated" : "deactivated"}.`, "success");
      } else {
        showToast(`✕ ${result.message ?? "Failed to update this account."}`, "error");
      }
    } else {
      const result = await resetPassword(pendingRowAction.userId);
      setPendingRowAction(null);
      if (result.success) {
        showToast("✓ Password reset email sent to the buyer.", "success");
      } else {
        showToast(`✕ ${result.message ?? "Failed to send the reset email."}`, "error");
      }
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="buyerManagementToolbar">
        <div className="buyerManagementFilters">
          <select
            className="buyerManagementFilterSelect"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input
            type="date"
            className="buyerManagementFilterInput"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            aria-label="Signup date from"
          />
          <input
            type="date"
            className="buyerManagementFilterInput"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            aria-label="Signup date to"
          />

          <input
            type="search"
            className="buyerManagementFilterInput buyerManagementSearchInput"
            placeholder="Search email or name…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search buyers"
          />

          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <button type="button" className="buyerManagementClearFiltersButton" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <button type="button" className="buyerManagementExportButton" onClick={handleExport} disabled={isExporting}>
          <Download size={16} />
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {isLoading ? (
        <div className="buyerManagementGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="buyerManagementRow buyerManagementRow--skeleton">
              <div className="buyerManagementSkeletonLine skeletonBlock" />
              <div className="buyerManagementSkeletonLine skeletonBlock buyerManagementSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="buyerManagementEmptyState">
          <UserRoundSearch size={32} />
          <p>{error}</p>
          <button type="button" className="buyerManagementRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : buyers.length === 0 ? (
        <div className="buyerManagementEmptyState">
          <UserRoundSearch size={32} />
          <p>No buyers match these filters.</p>
        </div>
      ) : (
        <>
          <div className="buyerManagementTableWrapper">
            <table className="buyerManagementTable">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Signup Date</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Total Orders</th>
                  <th>Lifetime Value</th>
                  <th className="buyerManagementActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => (
                  <tr key={buyer.userId}>
                    <td className="buyerManagementEmailCell">{buyer.email ?? "—"}</td>
                    <td>{buyer.name ?? "—"}</td>
                    <td>{formatDate(buyer.createdAt)}</td>
                    <td>{formatDate(buyer.lastLoginAt)}</td>
                    <td>
                      <span
                        className="buyerManagementStatusBadge"
                        style={{ color: buyer.isActive ? "var(--color-success)" : "var(--color-error)" }}
                      >
                        {buyer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{buyer.totalOrders}</td>
                    <td>{formatPeso(buyer.lifetimeValue)}</td>
                    <td className="buyerManagementActionsCell">
                      <div className="buyerManagementRowActions">
                        <Link href={`/superAdmin/buyer-management/${buyer.userId}`} className="buyerManagementActionLink">
                          View
                        </Link>
                        <button
                          type="button"
                          className="buyerManagementActionButton"
                          onClick={() =>
                            setPendingRowAction({
                              type: "toggleActive",
                              userId: buyer.userId,
                              email: buyer.email,
                              nextActive: !buyer.isActive,
                            })
                          }
                        >
                          {buyer.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          className="buyerManagementActionButton"
                          onClick={() =>
                            setPendingRowAction({ type: "resetPassword", userId: buyer.userId, email: buyer.email })
                          }
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="buyerManagementFooter">
            <span className="buyerManagementTotalCount">{totalCount} total buyer{totalCount === 1 ? "" : "s"}</span>

            {totalPages > 1 && (
              <div className="buyerManagementPagination">
                <button
                  type="button"
                  className="buyerManagementPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="buyerManagementPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="buyerManagementPageButton"
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
        isOpen={pendingRowAction?.type === "toggleActive"}
        title={pendingRowAction?.type === "toggleActive" && pendingRowAction.nextActive ? "Reactivate account?" : "Deactivate account?"}
        description={
          pendingRowAction?.type === "toggleActive"
            ? `Are you sure you want to ${pendingRowAction.nextActive ? "reactivate" : "deactivate"} ${
                pendingRowAction.email ?? "this buyer"
              }? ${pendingRowAction.nextActive ? "They will be able to log in again." : "They will be signed out and unable to log in."}`
            : ""
        }
        confirmLabel={pendingRowAction?.type === "toggleActive" && pendingRowAction.nextActive ? "Reactivate" : "Deactivate"}
        onConfirm={handleRowActionConfirm}
        onCancel={() => setPendingRowAction(null)}
      />

      <ConfirmationModal
        isOpen={pendingRowAction?.type === "resetPassword"}
        title="Send password reset email?"
        description={`This will email ${pendingRowAction?.type === "resetPassword" ? pendingRowAction.email ?? "this buyer" : "this buyer"} a link to set a new password.`}
        confirmLabel="Send Reset Email"
        onConfirm={handleRowActionConfirm}
        onCancel={() => setPendingRowAction(null)}
      />
    </>
  );
}
