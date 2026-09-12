/**
 * FILE: components/admin/AdminManagementList.tsx
 * ROLE: Super-Admin only — rendered inside
 * app/superAdmin/admin-management/page.tsx.
 *
 * PURPOSE:
 * task-96, super_admin_account_specification.md Section 3.2.1 (Admin
 * List Page): every admin account, newest first, with status/date-
 * range/search filters, a CSV export button, and per-row actions
 * (View Details, Edit, Deactivate/Reactivate, Reset Password,
 * Delete). Handles all three required data states (Rule 25): loading
 * skeleton, empty state, and error state with retry. Mirrors
 * components/admin/AdminUsersList.tsx's structure, minus the bulk-
 * action bar and compose-email modal that page's spec calls for but
 * this one's Section 3.2.1 does not.
 *
 * "View / Edit" links to /superAdmin/admin-management/[adminId]/edit
 * (task-98's combined display+edit page, wired in once that task
 * closed — a single link rather than separate View/Edit links, since
 * task-98 built one combined page, not two). The toolbar's "Create
 * Admin" button links to task-97's page (added once that task closed
 * — task-96's own scope called for this link but it was missed in
 * the initial build).
 *
 * Reuses the shared ConfirmationModal (Rule 34.4) before deactivating/
 * reactivating and before resetting a password, and the same modal's
 * new confirmDelaySeconds option (see components/shared/
 * ConfirmationModal.tsx) for Delete's required 5-second delay.
 *
 * Status is shown as a colored dot + label rather than the spec's
 * literal 🟢/🟡/🔴 glyphs — same three-state meaning (Active/
 * Inactive/Locked), rendered with the existing --color-success/
 * -warning/-error tokens (Rule 33.1) so it stays consistent with
 * every other status indicator in the app (Rule 17.3 avoids emoji as
 * UI chrome).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, UserCog, UserPlus } from "lucide-react";
import { useAdminManagement, type AdminAccountStatus } from "@/lib/hooks/useAdminManagement";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const DELETE_CONFIRM_DELAY_SECONDS = 5;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<AdminAccountStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  locked: "Locked",
};

// Section 3.2.1's 🟢/🟡/🔴 mapped to the existing status color tokens
// (Rule 33.1) rather than literal emoji — see file header note above.
const STATUS_COLOR_VAR: Record<AdminAccountStatus, string> = {
  active: "var(--color-success)",
  inactive: "var(--color-warning)",
  locked: "var(--color-error)",
};

// Which single-row action is pending confirmation.
type PendingRowAction =
  | { type: "toggleActive"; adminId: string; email: string | null; nextActive: boolean }
  | { type: "resetPassword"; adminId: string; email: string | null }
  | { type: "delete"; adminId: string; email: string | null }
  | null;

export default function AdminManagementList() {
  const {
    admins,
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
    deleteAdmin,
  } = useAdminManagement();

  const { toasts, showToast, dismissToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [pendingRowAction, setPendingRowAction] = useState<PendingRowAction>(null);

  async function handleExport() {
    setIsExporting(true);
    const result = await exportCsv();
    setIsExporting(false);
    if (result.success) {
      showToast("✓ Admin accounts exported to CSV.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleRowActionConfirm() {
    if (!pendingRowAction) return;

    if (pendingRowAction.type === "toggleActive") {
      const result = await setActive(pendingRowAction.adminId, pendingRowAction.nextActive);
      setPendingRowAction(null);
      if (result.success) {
        showToast(`✓ Admin account ${pendingRowAction.nextActive ? "reactivated" : "deactivated"}.`, "success");
      } else {
        showToast(`✕ ${result.message ?? "Failed to update this account."}`, "error");
      }
    } else if (pendingRowAction.type === "resetPassword") {
      const result = await resetPassword(pendingRowAction.adminId);
      setPendingRowAction(null);
      if (result.success) {
        showToast(`✓ New temporary password sent to ${pendingRowAction.email ?? "this admin"}.`, "success");
      } else {
        showToast(`✕ ${result.message ?? "Failed to send the new password."}`, "error");
      }
    } else {
      const result = await deleteAdmin(pendingRowAction.adminId);
      setPendingRowAction(null);
      if (result.success) {
        showToast(`✓ Admin account ${pendingRowAction.email ?? ""} deleted permanently.`, "success");
      } else {
        showToast(`✕ ${result.message ?? "Failed to delete this account."}`, "error");
      }
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminManagementToolbar">
        <div className="adminManagementFilters">
          <select
            className="adminManagementFilterSelect"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="locked">Locked</option>
          </select>

          <input
            type="date"
            className="adminManagementFilterInput"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            aria-label="Created from date"
          />
          <input
            type="date"
            className="adminManagementFilterInput"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            aria-label="Created to date"
          />

          <input
            type="search"
            className="adminManagementFilterInput adminManagementSearchInput"
            placeholder="Search email or name…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search admins"
          />

          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <button type="button" className="adminManagementClearFiltersButton" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <div className="adminManagementToolbarActions">
          <Link href="/superAdmin/admin-management/create" className="adminManagementCreateButton">
            <UserPlus size={16} />
            Create Admin
          </Link>
          <button type="button" className="adminManagementExportButton" onClick={handleExport} disabled={isExporting}>
            <Download size={16} />
            {isExporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="adminManagementGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="adminManagementRow adminManagementRow--skeleton">
              <div className="adminManagementSkeletonLine skeletonBlock" />
              <div className="adminManagementSkeletonLine skeletonBlock adminManagementSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="adminManagementEmptyState">
          <UserCog size={32} />
          <p>{error}</p>
          <button type="button" className="adminManagementRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : admins.length === 0 ? (
        <div className="adminManagementEmptyState">
          <UserCog size={32} />
          <p>No admin accounts match these filters.</p>
        </div>
      ) : (
        <>
          <div className="adminManagementTableWrapper">
            <table className="adminManagementTable">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Created Date</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th className="adminManagementActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const nextActive = admin.status === "inactive";
                  return (
                    <tr key={admin.adminId}>
                      <td className="adminManagementEmailCell">{admin.email ?? "—"}</td>
                      <td>{admin.name ?? "—"}</td>
                      <td>{formatDate(admin.createdAt)}</td>
                      <td>{formatDate(admin.lastLoginAt)}</td>
                      <td>
                        <span className="adminManagementStatusBadge">
                          <span
                            className="adminManagementStatusDot"
                            style={{ backgroundColor: STATUS_COLOR_VAR[admin.status] }}
                            aria-hidden="true"
                          />
                          {STATUS_LABEL[admin.status]}
                        </span>
                      </td>
                      <td className="adminManagementActionsCell">
                        <div className="adminManagementRowActions">
                          <Link
                            href={`/superAdmin/admin-management/${admin.adminId}/edit`}
                            className="adminManagementActionLink"
                          >
                            View / Edit
                          </Link>
                          <button
                            type="button"
                            className="adminManagementActionButton"
                            onClick={() =>
                              setPendingRowAction({
                                type: "toggleActive",
                                adminId: admin.adminId,
                                email: admin.email,
                                nextActive,
                              })
                            }
                          >
                            {nextActive ? "Reactivate" : "Deactivate"}
                          </button>
                          <button
                            type="button"
                            className="adminManagementActionButton"
                            onClick={() =>
                              setPendingRowAction({ type: "resetPassword", adminId: admin.adminId, email: admin.email })
                            }
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            className="adminManagementActionButton adminManagementActionButton--danger"
                            onClick={() => setPendingRowAction({ type: "delete", adminId: admin.adminId, email: admin.email })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="adminManagementFooter">
            <span className="adminManagementTotalCount">
              {totalCount} total admin{totalCount === 1 ? "" : "s"}
            </span>

            {totalPages > 1 && (
              <div className="adminManagementPagination">
                <button
                  type="button"
                  className="adminManagementPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="adminManagementPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="adminManagementPageButton"
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
        title={pendingRowAction?.type === "toggleActive" && pendingRowAction.nextActive ? "Reactivate admin account?" : "Deactivate admin account?"}
        description={
          pendingRowAction?.type === "toggleActive"
            ? `Are you sure you want to ${pendingRowAction.nextActive ? "reactivate" : "deactivate"} ${
                pendingRowAction.email ?? "this admin"
              }? ${
                pendingRowAction.nextActive
                  ? "They will be able to log in again."
                  : "They will be signed out and unable to log in."
              }`
            : ""
        }
        confirmLabel={pendingRowAction?.type === "toggleActive" && pendingRowAction.nextActive ? "Reactivate" : "Deactivate"}
        onConfirm={handleRowActionConfirm}
        onCancel={() => setPendingRowAction(null)}
      />

      <ConfirmationModal
        isOpen={pendingRowAction?.type === "resetPassword"}
        title="Send a new temporary password?"
        description={`This will generate a new temporary password and email it to ${
          pendingRowAction?.type === "resetPassword" ? pendingRowAction.email ?? "this admin" : "this admin"
        }. Their current password stops working immediately.`}
        confirmLabel="Send New Password"
        onConfirm={handleRowActionConfirm}
        onCancel={() => setPendingRowAction(null)}
      />

      <ConfirmationModal
        isOpen={pendingRowAction?.type === "delete"}
        title="Delete admin account?"
        description={`Are you sure you want to permanently delete ${
          pendingRowAction?.type === "delete" ? pendingRowAction.email ?? "this admin" : "this admin"
        }? This cannot be undone.`}
        confirmLabel="Delete"
        confirmDelaySeconds={DELETE_CONFIRM_DELAY_SECONDS}
        onConfirm={handleRowActionConfirm}
        onCancel={() => setPendingRowAction(null)}
      />
    </>
  );
}
