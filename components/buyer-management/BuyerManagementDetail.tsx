/**
 * FILE: components/buyer-management/BuyerManagementDetail.tsx
 * ROLE: Super-admin only — rendered inside
 * app/superAdmin/buyer-management/[buyerId]/page.tsx.
 *
 * PURPOSE:
 * task-108, super_admin_account_specification.md Section 3.8 (Row
 * Actions: View Details → order history + activity log,
 * Deactivate/Reactivate, Reset Password, Delete Account). Mirrors
 * components/admin/AdminUserDetail.tsx's account/last-login/orders/
 * activity layout and reuses its lib/hooks/useAdminUserDetail.ts hook
 * as-is (same underlying /api/admin/users/[buyerId] routes — Rule 2's
 * no-duplication principle, no second hook needed). Deliberately
 * narrower than AdminUserDetail.tsx: no Internal Notes or Send Email
 * sections — those are admin_account_specification.md's own Section
 * 3.4.2 actions, not part of this spec (same scope line drawn by
 * BuyerManagementList.tsx for the row-action set).
 *
 * Delete Account is the one action not on the /admin/users/[buyerId]
 * page — gated behind the shared ConfirmationModal's 5-second-delay
 * option (Rule 34.4, same DELETE_CONFIRM_DELAY_SECONDS precedent as
 * AdminManagementList.tsx's admin delete), calling task-106's new
 * "delete" action. On success, the buyer no longer exists to display,
 * so this navigates back to the list (900ms delay so the success
 * toast is visible first — same precedent as
 * useCreateAdminForm.ts/TotpEnrollmentForm.tsx's post-action redirect)
 * rather than refetching a now-404 buyer.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserX, LogIn, ShoppingBag, Activity, UserCog } from "lucide-react";
import { useAdminUserDetail } from "@/lib/hooks/useAdminUserDetail";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const DELETE_CONFIRM_DELAY_SECONDS = 5;

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BuyerManagementDetail({ buyerId }: { buyerId: string }) {
  const router = useRouter();
  const {
    buyer,
    isLoading,
    notFound,
    error,
    isTogglingActive,
    isResettingPassword,
    isDeleting,
    setActive,
    resetPassword,
    deleteAccount,
  } = useAdminUserDetail(buyerId);

  const { toasts, showToast, dismissToast } = useToast();

  const [isActiveModalOpen, setIsActiveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  async function handleActiveConfirm() {
    if (!buyer) return;
    const result = await setActive(!buyer.account.isActive);
    setIsActiveModalOpen(false);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
  }

  async function handleResetConfirm() {
    const result = await resetPassword();
    setIsResetModalOpen(false);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
  }

  // Deletes the account, then — only on success — navigates back to
  // the list after a short delay so the toast is visible first. On
  // failure the modal simply closes and the page stays put.
  async function handleDeleteConfirm() {
    const result = await deleteAccount();
    setIsDeleteModalOpen(false);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
    if (result.success) {
      setTimeout(() => router.push("/superAdmin/buyer-management"), 900);
    }
  }

  if (isLoading) {
    return (
      <div className="buyerManagementDetailSkeleton">
        <div className="buyerManagementDetailSkeletonBlock skeletonBlock" />
        <div className="buyerManagementDetailSkeletonBlock skeletonBlock" />
        <div className="buyerManagementDetailSkeletonBlock skeletonBlock" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="buyerManagementDetailEmptyState">
        <UserX size={32} />
        <p>We couldn&apos;t find that buyer. They may have been removed.</p>
        <Link href="/superAdmin/buyer-management" className="buyerManagementDetailBackLink">
          Back to Buyer Management
        </Link>
      </div>
    );
  }

  if (error || !buyer) {
    return (
      <div className="buyerManagementDetailEmptyState">
        <UserX size={32} />
        <p>{error ?? "Something went wrong loading this buyer."}</p>
        <Link href="/superAdmin/buyer-management" className="buyerManagementDetailBackLink">
          Back to Buyer Management
        </Link>
      </div>
    );
  }

  const { account } = buyer;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="buyerManagementDetailTopRow">
        <Link href="/superAdmin/buyer-management" className="buyerManagementDetailBackLink">
          <ArrowLeft size={16} /> Back to Buyer Management
        </Link>
      </div>

      <div className="buyerManagementDetailHeaderRow">
        <div>
          <p className="buyerManagementDetailEyebrow">Buyer</p>
          <h1 className="buyerManagementDetailTitle">{account.name ?? account.email ?? "Unnamed buyer"}</h1>
          <p className="buyerManagementDetailMeta">Joined {formatDateTime(account.createdAt)}</p>
        </div>
        <span
          className="buyerManagementDetailStatusBadge"
          style={{ color: account.isActive ? "var(--color-success)" : "var(--color-error)" }}
        >
          {account.isActive ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="buyerManagementDetailGrid">
        <section className="buyerManagementDetailCard">
          <h2 className="buyerManagementDetailSectionTitle">
            <UserCog size={16} /> Account
          </h2>
          <p className="buyerManagementDetailLine">{account.email ?? "No email on file"}</p>
          <p className="buyerManagementDetailLineMuted">{account.phone ?? "No phone on file"}</p>
        </section>

        <section className="buyerManagementDetailCard">
          <h2 className="buyerManagementDetailSectionTitle">
            <LogIn size={16} /> Last login
          </h2>
          {account.lastLogin ? (
            <>
              <p className="buyerManagementDetailLine">{formatDateTime(account.lastLogin.at)}</p>
              <p className="buyerManagementDetailLineMuted">
                {account.lastLogin.geoCity ?? "Unknown city"}
                {account.lastLogin.geoCountry ? `, ${account.lastLogin.geoCountry}` : ""}
                {account.lastLogin.ipAddress ? ` · ${account.lastLogin.ipAddress}` : ""}
              </p>
            </>
          ) : (
            <p className="buyerManagementDetailLineMuted">No login recorded yet.</p>
          )}
        </section>
      </div>

      <section className="buyerManagementDetailListSection">
        <h2 className="buyerManagementDetailSectionTitle">
          <ShoppingBag size={16} /> Recent orders
        </h2>
        {buyer.orders.length === 0 && <p className="buyerManagementDetailLineMuted">No orders yet.</p>}
        <ul className="buyerManagementDetailOrdersList">
          {buyer.orders.map((order) => (
            <li key={order.id} className="buyerManagementDetailOrderRow">
              <Link href={`/admin/orders/${order.id}`} className="buyerManagementDetailOrderLink">
                #{order.id.slice(-8).toUpperCase()}
              </Link>
              <span className="buyerManagementDetailLineMuted">{formatDateTime(order.createdAt)}</span>
              <span className="buyerManagementDetailLineMuted">{order.status}</span>
              <span className="buyerManagementDetailOrderTotal">{formatPeso(order.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="buyerManagementDetailListSection">
        <h2 className="buyerManagementDetailSectionTitle">
          <Activity size={16} /> Account activity
        </h2>
        {buyer.activity.length === 0 && (
          <p className="buyerManagementDetailLineMuted">No activity recorded yet.</p>
        )}
        <ul className="buyerManagementDetailActivityList">
          {buyer.activity.map((entry, index) => (
            <li key={`${entry.action}-${entry.createdAt}-${index}`} className="buyerManagementDetailActivityRow">
              <p className="buyerManagementDetailLine">{entry.action}</p>
              <p className="buyerManagementDetailLineMuted">
                {formatDateTime(entry.createdAt)}
                {entry.geoCity ? ` · ${entry.geoCity}` : ""}
                {entry.deviceType ? ` · ${entry.deviceType}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="buyerManagementDetailActionsSection">
        <h2 className="buyerManagementDetailSectionTitle">Account access</h2>
        <div className="buyerManagementDetailActionRow">
          <button
            type="button"
            className={
              account.isActive
                ? "buyerManagementDetailButton buyerManagementDetailButton--destructive"
                : "buyerManagementDetailButton buyerManagementDetailButton--primary"
            }
            onClick={() => setIsActiveModalOpen(true)}
            disabled={isTogglingActive}
          >
            {account.isActive ? "Deactivate account" : "Reactivate account"}
          </button>
          <button
            type="button"
            className="buyerManagementDetailButton buyerManagementDetailButton--secondary"
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResettingPassword || !account.email}
          >
            Reset password
          </button>
        </div>

        <h2 className="buyerManagementDetailSectionTitle">Danger zone</h2>
        <div className="buyerManagementDetailActionRow">
          <button
            type="button"
            className="buyerManagementDetailButton buyerManagementDetailButton--destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeleting}
          >
            Delete account
          </button>
        </div>
      </section>

      <ConfirmationModal
        isOpen={isActiveModalOpen}
        title={account.isActive ? "Deactivate this account?" : "Reactivate this account?"}
        description={
          account.isActive
            ? `Deactivate ${account.email ?? "this buyer"}? They will not be able to sign in until reactivated.`
            : `Reactivate ${account.email ?? "this buyer"}? They will be able to sign in again.`
        }
        confirmLabel={account.isActive ? "Deactivate" : "Reactivate"}
        onConfirm={handleActiveConfirm}
        onCancel={() => setIsActiveModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Send password reset?"
        description={`Send a password reset link to ${account.email ?? "this buyer"}?`}
        confirmLabel="Send reset link"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete this account?"
        description={`Are you sure you want to permanently delete ${
          account.email ?? "this buyer"
        }? This cannot be undone.`}
        confirmLabel="Delete"
        confirmDelaySeconds={DELETE_CONFIRM_DELAY_SECONDS}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
