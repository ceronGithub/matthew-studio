/**
 * FILE: components/admin/AdminUsersList.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/users/page.tsx.
 *
 * PURPOSE:
 * Buyer list page (task-87, admin_account_specification.md Section
 * 3.4.1): every buyer account, newest first, with status/date-range/
 * search filters, checkbox row selection + a bulk deactivate/
 * reactivate bar, a CSV export button, and per-row actions (View
 * Details, Deactivate/Reactivate, Reset Password, Send Email).
 * Handles all three required data states (Rule 25): loading
 * skeleton, empty state, and error state with retry. Mirrors
 * components/admin/AdminOrdersList.tsx's structure.
 *
 * "View Details" links to /admin/users/[buyerId] (task-88 — route
 * exists here so this page ships ready for it, even before that page
 * is built, same precedent as AdminOrdersList's link to task-81).
 *
 * Reuses the shared ConfirmationModal (Rule 34.4) before deactivating/
 * reactivating (single row or bulk) and before sending a password
 * reset — all irreversible-enough or externally-visible actions to
 * warrant a confirm step. "Send Email" needs form fields the shared
 * modal doesn't support, so it gets its own lightweight compose
 * modal built from the same modal CSS pattern (confirmationModal*).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, UserRoundSearch } from "lucide-react";
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

// Which single-row action is pending confirmation (or a compose-email draft).
type PendingRowAction =
  | { type: "toggleActive"; userId: string; email: string | null; nextActive: boolean }
  | { type: "resetPassword"; userId: string; email: string | null }
  | null;

export default function AdminUsersList() {
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
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    exportCsv,
    setActive,
    bulkSetActive,
    resetPassword,
    sendEmail,
  } = useAdminUsers();

  const { toasts, showToast, dismissToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [pendingRowAction, setPendingRowAction] = useState<PendingRowAction>(null);
  const [pendingBulkActivate, setPendingBulkActivate] = useState<boolean | null>(null);
  const [emailDraftUser, setEmailDraftUser] = useState<{ userId: string; email: string | null } | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  async function handleBulkConfirm() {
    if (pendingBulkActivate === null) return;
    const activate = pendingBulkActivate;
    const { succeeded, failed } = await bulkSetActive(activate);
    setPendingBulkActivate(null);
    const verb = activate ? "reactivated" : "deactivated";
    if (failed === 0) {
      showToast(`✓ ${succeeded} account${succeeded === 1 ? "" : "s"} ${verb}.`, "success");
    } else if (succeeded === 0) {
      showToast(`✕ Failed to ${activate ? "reactivate" : "deactivate"} the selected accounts.`, "error");
    } else {
      showToast(`⚠ ${succeeded} ${verb}, ${failed} failed. Check the list below.`, "warning");
    }
  }

  function openEmailDraft(userId: string, email: string | null) {
    setEmailDraftUser({ userId, email });
    setEmailSubject("");
    setEmailBody("");
  }

  async function handleSendEmail() {
    if (!emailDraftUser) return;
    setIsSendingEmail(true);
    const result = await sendEmail(emailDraftUser.userId, emailSubject, emailBody);
    setIsSendingEmail(false);
    if (result.success) {
      showToast("✓ Email sent to the buyer.", "success");
      setEmailDraftUser(null);
    } else {
      showToast(`✕ ${result.message ?? "Failed to send email. Please try again."}`, "error");
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminUsersToolbar">
        <div className="adminUsersFilters">
          <select
            className="adminUsersFilterSelect"
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
            className="adminUsersFilterInput"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            aria-label="Created from date"
          />
          <input
            type="date"
            className="adminUsersFilterInput"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            aria-label="Created to date"
          />

          <input
            type="search"
            className="adminUsersFilterInput adminUsersSearchInput"
            placeholder="Search email or name…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search buyers"
          />

          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <button type="button" className="adminUsersClearFiltersButton" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <button type="button" className="adminUsersExportButton" onClick={handleExport} disabled={isExporting}>
          <Download size={16} />
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="adminUsersBulkBar">
          <span className="adminUsersBulkCount">{selectedIds.size} selected</span>
          <button
            type="button"
            className="adminUsersBulkApplyButton"
            onClick={() => setPendingBulkActivate(false)}
          >
            Deactivate selected
          </button>
          <button
            type="button"
            className="adminUsersBulkApplyButton adminUsersBulkApplyButton--secondary"
            onClick={() => setPendingBulkActivate(true)}
          >
            Reactivate selected
          </button>
          <button type="button" className="adminUsersBulkClearButton" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="adminUsersGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="adminUsersRow adminUsersRow--skeleton">
              <div className="adminUsersSkeletonLine skeletonBlock" />
              <div className="adminUsersSkeletonLine skeletonBlock adminUsersSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="adminUsersEmptyState">
          <UserRoundSearch size={32} />
          <p>{error}</p>
          <button type="button" className="adminUsersRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : buyers.length === 0 ? (
        <div className="adminUsersEmptyState">
          <UserRoundSearch size={32} />
          <p>No buyers match these filters.</p>
        </div>
      ) : (
        <>
          <div className="adminUsersTableWrapper">
            <table className="adminUsersTable">
              <thead>
                <tr>
                  <th className="adminUsersCheckboxCell">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === buyers.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all buyers on this page"
                    />
                  </th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Account Created</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Total Orders</th>
                  <th>Lifetime Value</th>
                  <th className="adminUsersActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => (
                  <tr
                    key={buyer.userId}
                    className={selectedIds.has(buyer.userId) ? "adminUsersTableRow--selected" : ""}
                  >
                    <td className="adminUsersCheckboxCell">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(buyer.userId)}
                        onChange={() => toggleSelect(buyer.userId)}
                        aria-label={`Select ${buyer.email ?? "buyer"}`}
                      />
                    </td>
                    <td className="adminUsersEmailCell">{buyer.email ?? "—"}</td>
                    <td>{buyer.name ?? "—"}</td>
                    <td>{formatDate(buyer.createdAt)}</td>
                    <td>{formatDate(buyer.lastLoginAt)}</td>
                    <td>
                      <span
                        className="adminUsersStatusBadge"
                        style={{ color: buyer.isActive ? "var(--color-success)" : "var(--color-error)" }}
                      >
                        {buyer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{buyer.totalOrders}</td>
                    <td>{formatPeso(buyer.lifetimeValue)}</td>
                    <td className="adminUsersActionsCell">
                      <div className="adminUsersRowActions">
                        <Link href={`/admin/users/${buyer.userId}`} className="adminUsersActionLink">
                          View
                        </Link>
                        <button
                          type="button"
                          className="adminUsersActionButton"
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
                          className="adminUsersActionButton"
                          onClick={() =>
                            setPendingRowAction({ type: "resetPassword", userId: buyer.userId, email: buyer.email })
                          }
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          className="adminUsersActionButton"
                          onClick={() => openEmailDraft(buyer.userId, buyer.email)}
                        >
                          Send Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="adminUsersFooter">
            <span className="adminUsersTotalCount">{totalCount} total buyer{totalCount === 1 ? "" : "s"}</span>

            {totalPages > 1 && (
              <div className="adminUsersPagination">
                <button
                  type="button"
                  className="adminUsersPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="adminUsersPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="adminUsersPageButton"
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

      <ConfirmationModal
        isOpen={pendingBulkActivate !== null}
        title={pendingBulkActivate ? "Reactivate selected accounts?" : "Deactivate selected accounts?"}
        description={`Are you sure you want to ${pendingBulkActivate ? "reactivate" : "deactivate"} ${selectedIds.size} selected account${
          selectedIds.size === 1 ? "" : "s"
        }?`}
        confirmLabel={pendingBulkActivate ? "Reactivate" : "Deactivate"}
        onConfirm={handleBulkConfirm}
        onCancel={() => setPendingBulkActivate(null)}
      />

      {emailDraftUser && (
        <div className="confirmationModalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmationModalDialog adminUsersEmailModalDialog">
            <h2 className="confirmationModalTitle">Email {emailDraftUser.email ?? "buyer"}</h2>
            <div className="adminUsersEmailForm">
              <input
                type="text"
                className="adminUsersEmailInput"
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                autoFocus
              />
              <textarea
                className="adminUsersEmailTextarea"
                placeholder="Message"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={5}
              />
            </div>
            <div className="confirmationModalActions">
              <button
                type="button"
                className="confirmationModalCancelButton"
                onClick={() => setEmailDraftUser(null)}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adminUsersEmailSendButton"
                onClick={handleSendEmail}
                disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
              >
                {isSendingEmail ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
