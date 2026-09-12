/**
 * FILE: components/admin/AdminManagementDetail.tsx
 * ROLE: Super-Admin only — rendered inside app/superAdmin/
 * admin-management/[adminId]/edit/page.tsx.
 *
 * PURPOSE:
 * Admin Details & Edit page (task-98, super_admin_account_
 * specification.md Section 3.2.3): a single combined display+edit
 * surface — account info (email, role, created date + creator,
 * status), last-login card (date/time + IP + city-level location),
 * an editable full-name field, an editable permissions checkbox
 * group (reusing lib/hooks/useCreateAdminForm.ts's PERMISSION_OPTIONS
 * so labels never drift out of sync with the create form), and the
 * Reset Password / Deactivate-Reactivate actions. Handles all three
 * required data states (Rule 25) plus a dedicated "not found" state,
 * same pattern as AdminUserDetail.tsx.
 *
 * GROUNDING NOTE (Rule 0D): task-98's own scope text mentions Rule
 * 31.10's server-side notFound() pattern, but every other admin/
 * super-admin detail page actually in this codebase (AdminUserDetail,
 * this page's closest sibling) uses a client-side notFound flag from
 * its data hook instead — not-found.tsx only exists under the public
 * (blog/tshirts/etc.) routes. This page follows the pattern that's
 * actually established for admin detail pages, for consistency with
 * its sibling, rather than introducing the only server-notFound()
 * admin page in the app.
 *
 * Section 3.2.3 lists both an editable "status toggle" and a separate
 * "Deactivate Account" button as two bullets. Since the underlying
 * API only exposes one deactivate/reactivate action (task-95's
 * toggle-status route — there's no separate "status" field on the
 * PATCH edit route), this page implements both bullets as a single
 * status card with a Deactivate/Reactivate button behind the shared
 * ConfirmationModal (Rule 34.4) — the same action, not two competing
 * controls that could disagree with each other.
 *
 * "Save Changes" only ever calls PATCH (name/permissions). Status
 * changes go through their own confirmation modal and API call
 * immediately, same as every other admin/buyer status toggle in the
 * app — never bundled into the Save Changes submit.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, LogIn, ShieldAlert, UserCog, UserX } from "lucide-react";
import { useAdminManagementDetail } from "@/lib/hooks/useAdminManagementDetail";
import { PERMISSION_OPTIONS } from "@/lib/hooks/useCreateAdminForm";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

// Same first line of defense as every other user-facing text input in
// the app (Rule 18.1) — mirrors useCreateAdminForm.ts's own constant.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = { active: "Active", inactive: "Inactive", locked: "Locked" };
const STATUS_COLOR_VAR: Record<string, string> = {
  active: "var(--color-success)",
  inactive: "var(--color-warning)",
  locked: "var(--color-error)",
};

export default function AdminManagementDetail({ adminId }: { adminId: string }) {
  const {
    admin,
    isLoading,
    notFound,
    error,
    isSaving,
    isTogglingActive,
    isResettingPassword,
    save,
    setActive,
    resetPassword,
  } = useAdminManagementDetail(adminId);

  const { toasts, showToast, dismissToast } = useToast();

  const [fullNameDraft, setFullNameDraft] = useState("");
  const [permissionsDraft, setPermissionsDraft] = useState<string[]>([]);
  const [fullNameError, setFullNameError] = useState<string | null>(null);

  const [isActiveModalOpen, setIsActiveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Seed the editable drafts once the account loads — never overwrite
  // an in-progress edit if a background refetch happens to re-run.
  useEffect(() => {
    if (!admin) return;
    setFullNameDraft(admin.name ?? "");
    setPermissionsDraft(admin.permissions);
  }, [admin]);

  function togglePermission(permission: string) {
    setPermissionsDraft((current) =>
      current.includes(permission) ? current.filter((existing) => existing !== permission) : [...current, permission]
    );
  }

  function handleCancelEdits() {
    if (!admin) return;
    setFullNameDraft(admin.name ?? "");
    setPermissionsDraft(admin.permissions);
    setFullNameError(null);
  }

  async function handleSave() {
    const trimmedName = fullNameDraft.trim();
    if (trimmedName.length < 2) {
      setFullNameError("Enter a full name (at least 2 characters).");
      return;
    }
    setFullNameError(null);

    const result = await save(trimmedName.replace(FORBIDDEN_CHARACTERS, ""), permissionsDraft);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
  }

  async function handleActiveConfirm() {
    if (!admin) return;
    const result = await setActive(admin.status === "inactive");
    setIsActiveModalOpen(false);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
  }

  async function handleResetConfirm() {
    const result = await resetPassword();
    setIsResetModalOpen(false);
    showToast(`${result.success ? "✓" : "✕"} ${result.message}`, result.success ? "success" : "error");
  }

  if (isLoading) {
    return (
      <div className="adminManagementDetailSkeleton">
        <div className="adminManagementDetailSkeletonBlock skeletonBlock" />
        <div className="adminManagementDetailSkeletonBlock skeletonBlock" />
        <div className="adminManagementDetailSkeletonBlock skeletonBlock" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="adminManagementDetailEmptyState">
        <UserX size={32} />
        <p>We couldn&apos;t find that admin account. It may have been removed.</p>
        <Link href="/superAdmin/admin-management" className="adminManagementDetailBackLink">
          Back to admin management
        </Link>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className="adminManagementDetailEmptyState">
        <UserX size={32} />
        <p>{error ?? "Something went wrong loading this admin account."}</p>
        <Link href="/superAdmin/admin-management" className="adminManagementDetailBackLink">
          Back to admin management
        </Link>
      </div>
    );
  }

  const isReactivating = admin.status === "inactive";
  const hasUnsavedChanges =
    fullNameDraft.trim() !== (admin.name ?? "") ||
    permissionsDraft.length !== admin.permissions.length ||
    permissionsDraft.some((permission) => !admin.permissions.includes(permission));

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="adminManagementDetailTopRow">
        <Link href="/superAdmin/admin-management" className="adminManagementDetailBackLink">
          <ArrowLeft size={16} /> Back to admin management
        </Link>
      </div>

      <div className="adminManagementDetailHeaderRow">
        <div>
          <p className="adminManagementDetailEyebrow">Admin Account</p>
          <h1 className="adminManagementDetailTitle">{admin.name ?? admin.email ?? "Unnamed admin"}</h1>
          <p className="adminManagementDetailMeta">
            {admin.email ?? "No email on file"} · Role: {admin.role}
          </p>
        </div>
        <span className="adminManagementDetailStatusBadge">
          <span
            className="adminManagementDetailStatusDot"
            style={{ backgroundColor: STATUS_COLOR_VAR[admin.status] }}
            aria-hidden="true"
          />
          {STATUS_LABEL[admin.status]}
        </span>
      </div>

      <div className="adminManagementDetailGrid">
        <section className="adminManagementDetailCard">
          <h2 className="adminManagementDetailSectionTitle">
            <UserCog size={16} /> Account
          </h2>
          <p className="adminManagementDetailLine">Created {formatDate(admin.createdAt)}</p>
          <p className="adminManagementDetailLineMuted">
            {admin.createdBy ? `by ${admin.createdBy}` : "Creator not on file (created before this was tracked)"}
          </p>
        </section>

        <section className="adminManagementDetailCard">
          <h2 className="adminManagementDetailSectionTitle">
            <LogIn size={16} /> Last login
          </h2>
          {admin.lastLogin ? (
            <>
              <p className="adminManagementDetailLine">{formatDateTime(admin.lastLogin.at)}</p>
              <p className="adminManagementDetailLineMuted">
                {admin.lastLogin.geoCity ?? "Unknown city"}
                {admin.lastLogin.geoCountry ? `, ${admin.lastLogin.geoCountry}` : ""}
                {admin.lastLogin.ipAddress ? ` · ${admin.lastLogin.ipAddress}` : ""}
              </p>
            </>
          ) : (
            <p className="adminManagementDetailLineMuted">No login recorded yet.</p>
          )}
        </section>
      </div>

      <section className="adminManagementDetailEditSection">
        <h2 className="adminManagementDetailSectionTitle">
          <UserCog size={16} /> Edit details
        </h2>

        <label className="adminManagementDetailField">
          <span>
            Full name <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            value={fullNameDraft}
            onChange={(event) => setFullNameDraft(event.target.value)}
            aria-invalid={Boolean(fullNameError)}
          />
          {fullNameError && (
            <span role="alert" className="adminManagementDetailFieldError">
              {fullNameError}
            </span>
          )}
        </label>

        <fieldset className="adminManagementDetailPermissionsFieldset">
          <legend>Permissions</legend>
          {PERMISSION_OPTIONS.map((permission) => (
            <label key={permission.value} className="adminManagementDetailPermissionCheckbox">
              <input
                type="checkbox"
                checked={permissionsDraft.includes(permission.value)}
                onChange={() => togglePermission(permission.value)}
              />
              <span>
                <span className="adminManagementDetailPermissionLabel">{permission.label}</span>
                <span className="adminManagementDetailPermissionDescription">{permission.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="adminManagementDetailEditActions">
          <button
            type="button"
            className="adminManagementDetailButton adminManagementDetailButton--secondary"
            onClick={handleCancelEdits}
            disabled={isSaving || !hasUnsavedChanges}
          >
            Cancel
          </button>
          <button
            type="button"
            className="adminManagementDetailButton adminManagementDetailButton--primary"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </section>

      <section className="adminManagementDetailActionsSection">
        <h2 className="adminManagementDetailSectionTitle">
          <ShieldAlert size={16} /> Account access
        </h2>
        <div className="adminManagementDetailActionRow">
          <button
            type="button"
            className={
              isReactivating
                ? "adminManagementDetailButton adminManagementDetailButton--primary"
                : "adminManagementDetailButton adminManagementDetailButton--destructive"
            }
            onClick={() => setIsActiveModalOpen(true)}
            disabled={isTogglingActive}
          >
            {isReactivating ? "Reactivate account" : "Deactivate account"}
          </button>
          <button
            type="button"
            className="adminManagementDetailButton adminManagementDetailButton--secondary"
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResettingPassword || !admin.email}
          >
            <KeyRound size={16} />
            Reset password
          </button>
        </div>
      </section>

      <ConfirmationModal
        isOpen={isActiveModalOpen}
        title={isReactivating ? "Reactivate this admin account?" : "Deactivate this admin account?"}
        description={
          isReactivating
            ? `Reactivate ${admin.email ?? "this admin"}? They will be able to sign in again.`
            : `Deactivate ${admin.email ?? "this admin"}? They will be signed out and unable to sign in until reactivated.`
        }
        confirmLabel={isReactivating ? "Reactivate" : "Deactivate"}
        onConfirm={handleActiveConfirm}
        onCancel={() => setIsActiveModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Send a new temporary password?"
        description={`This will generate a new temporary password and email it to ${
          admin.email ?? "this admin"
        }. Their current password stops working immediately.`}
        confirmLabel="Send New Password"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </>
  );
}
