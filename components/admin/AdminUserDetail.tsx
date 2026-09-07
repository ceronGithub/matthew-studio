/**
 * FILE: components/admin/AdminUserDetail.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/users/[buyerId]/page.tsx.
 *
 * PURPOSE:
 * Buyer Details page (task-88, admin_account_specification.md
 * Section 3.4.2): account info card, last-login card, recent order
 * history, account activity trail, internal notes, and the four
 * task-86 actions (deactivate/reactivate, reset password, send
 * email, add note). Handles all three required data states
 * (Rule 25) plus a dedicated "not found" state, same pattern as
 * AdminOrderDetail.tsx.
 *
 * Deactivate/Reactivate and Reset Password both go behind the shared
 * ConfirmationModal (Rule 34.4) — same precedent as
 * AdminOrderDetail.tsx's update-status/refund actions, since both
 * affect account access. Add Note and Send Email are non-destructive
 * and submit directly (Rule 34.3).
 *
 * Known gap (carried over from task-85's API): recordAccountActivity()
 * isn't wired into any buyer-facing layout yet, so the Activity
 * section will show its empty state until that instrumentation lands
 * as its own task.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserX, LogIn, ShoppingBag, Activity, StickyNote, Mail, UserCog } from "lucide-react";
import { useAdminUserDetail } from "@/lib/hooks/useAdminUserDetail";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

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

export default function AdminUserDetail({ buyerId }: { buyerId: string }) {
  const {
    buyer,
    isLoading,
    notFound,
    error,
    isTogglingActive,
    isResettingPassword,
    isSendingEmail,
    isAddingNote,
    setActive,
    resetPassword,
    sendBuyerEmail,
    addNote,
  } = useAdminUserDetail(buyerId);

  const { toasts, showToast, dismissToast } = useToast();

  const [isActiveModalOpen, setIsActiveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

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

  async function handleAddNote() {
    if (!noteDraft.trim()) return;
    const result = await addNote(noteDraft);
    if (result.success) {
      setNoteDraft("");
      showToast("✓ Note added.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast("✕ Please fill in both a subject and a message.", "error");
      return;
    }
    const result = await sendBuyerEmail(emailSubject, emailBody);
    if (result.success) {
      setEmailSubject("");
      setEmailBody("");
      showToast("✓ Email sent to the buyer.", "success");
    } else {
      showToast(`✕ ${result.message}`, "error");
    }
  }

  if (isLoading) {
    return (
      <div className="adminUserDetailSkeleton">
        <div className="adminUserDetailSkeletonBlock skeletonBlock" />
        <div className="adminUserDetailSkeletonBlock skeletonBlock" />
        <div className="adminUserDetailSkeletonBlock skeletonBlock" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="adminUserDetailEmptyState">
        <UserX size={32} />
        <p>We couldn&apos;t find that buyer. They may have been removed.</p>
        <Link href="/admin/users" className="adminUserDetailBackLink">
          Back to users
        </Link>
      </div>
    );
  }

  if (error || !buyer) {
    return (
      <div className="adminUserDetailEmptyState">
        <UserX size={32} />
        <p>{error ?? "Something went wrong loading this buyer."}</p>
        <Link href="/admin/users" className="adminUserDetailBackLink">
          Back to users
        </Link>
      </div>
    );
  }

  const { account } = buyer;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminUserDetailTopRow">
        <Link href="/admin/users" className="adminUserDetailBackLink">
          <ArrowLeft size={16} /> Back to users
        </Link>
      </div>

      <div className="adminUserDetailHeaderRow">
        <div>
          <p className="adminUserDetailEyebrow">Buyer</p>
          <h1 className="adminUserDetailTitle">{account.name ?? account.email ?? "Unnamed buyer"}</h1>
          <p className="adminUserDetailMeta">Joined {formatDateTime(account.createdAt)}</p>
        </div>
        <span
          className="adminUserDetailStatusBadge"
          style={{ color: account.isActive ? "var(--color-success)" : "var(--color-error)" }}
        >
          {account.isActive ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="adminUserDetailGrid">
        <section className="adminUserDetailCard">
          <h2 className="adminUserDetailSectionTitle">
            <UserCog size={16} /> Account
          </h2>
          <p className="adminUserDetailLine">{account.email ?? "No email on file"}</p>
          <p className="adminUserDetailLineMuted">{account.phone ?? "No phone on file"}</p>
        </section>

        <section className="adminUserDetailCard">
          <h2 className="adminUserDetailSectionTitle">
            <LogIn size={16} /> Last login
          </h2>
          {account.lastLogin ? (
            <>
              <p className="adminUserDetailLine">{formatDateTime(account.lastLogin.at)}</p>
              <p className="adminUserDetailLineMuted">
                {account.lastLogin.geoCity ?? "Unknown city"}
                {account.lastLogin.geoCountry ? `, ${account.lastLogin.geoCountry}` : ""}
                {account.lastLogin.ipAddress ? ` · ${account.lastLogin.ipAddress}` : ""}
              </p>
            </>
          ) : (
            <p className="adminUserDetailLineMuted">No login recorded yet.</p>
          )}
        </section>
      </div>

      <section className="adminUserDetailListSection">
        <h2 className="adminUserDetailSectionTitle">
          <ShoppingBag size={16} /> Recent orders
        </h2>
        {buyer.orders.length === 0 && <p className="adminUserDetailLineMuted">No orders yet.</p>}
        <ul className="adminUserDetailOrdersList">
          {buyer.orders.map((order) => (
            <li key={order.id} className="adminUserDetailOrderRow">
              <Link href={`/admin/orders/${order.id}`} className="adminUserDetailOrderLink">
                #{order.id.slice(-8).toUpperCase()}
              </Link>
              <span className="adminUserDetailLineMuted">{formatDateTime(order.createdAt)}</span>
              <span className="adminUserDetailLineMuted">{order.status}</span>
              <span className="adminUserDetailOrderTotal">{formatPeso(order.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="adminUserDetailListSection">
        <h2 className="adminUserDetailSectionTitle">
          <Activity size={16} /> Account activity
        </h2>
        {buyer.activity.length === 0 && (
          <p className="adminUserDetailLineMuted">No activity recorded yet.</p>
        )}
        <ul className="adminUserDetailActivityList">
          {buyer.activity.map((entry, index) => (
            <li key={`${entry.action}-${entry.createdAt}-${index}`} className="adminUserDetailActivityRow">
              <p className="adminUserDetailLine">{entry.action}</p>
              <p className="adminUserDetailLineMuted">
                {formatDateTime(entry.createdAt)}
                {entry.geoCity ? ` · ${entry.geoCity}` : ""}
                {entry.deviceType ? ` · ${entry.deviceType}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="adminUserDetailActionsSection">
        <h2 className="adminUserDetailSectionTitle">Account access</h2>
        <div className="adminUserDetailActionRow">
          <button
            type="button"
            className={
              account.isActive
                ? "adminUserDetailButton adminUserDetailButton--destructive"
                : "adminUserDetailButton adminUserDetailButton--primary"
            }
            onClick={() => setIsActiveModalOpen(true)}
            disabled={isTogglingActive}
          >
            {account.isActive ? "Deactivate account" : "Reactivate account"}
          </button>
          <button
            type="button"
            className="adminUserDetailButton adminUserDetailButton--secondary"
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResettingPassword || !account.email}
          >
            Reset password
          </button>
        </div>

        <h2 className="adminUserDetailSectionTitle">
          <StickyNote size={16} /> Internal notes
        </h2>
        <ul className="adminUserDetailNotesList">
          {buyer.internalNotes.length === 0 && <li className="adminUserDetailLineMuted">No internal notes yet.</li>}
          {buyer.internalNotes.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="adminUserDetailNoteRow">
              <p>{entry.note}</p>
              <p className="adminUserDetailLineMuted">{formatDateTime(entry.createdAt)}</p>
            </li>
          ))}
        </ul>
        <div className="adminUserDetailActionRow">
          <input
            type="text"
            className="adminUserDetailInput"
            placeholder="Add an internal note"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <button
            type="button"
            className="adminUserDetailButton adminUserDetailButton--secondary"
            onClick={handleAddNote}
            disabled={isAddingNote || !noteDraft.trim()}
          >
            Add note
          </button>
        </div>

        <h2 className="adminUserDetailSectionTitle">
          <Mail size={16} /> Email buyer
        </h2>
        <div className="adminUserDetailEmailForm">
          <input
            type="text"
            className="adminUserDetailInput"
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
          <textarea
            className="adminUserDetailTextarea"
            placeholder="Message"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={4}
          />
          <button
            type="button"
            className="adminUserDetailButton adminUserDetailButton--primary"
            onClick={handleSendEmail}
            disabled={isSendingEmail || !account.email}
          >
            {isSendingEmail ? "Sending…" : "Send email"}
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
    </>
  );
}
