/**
 * FILE: lib/hooks/useAdminManagementDetail.ts
 * PURPOSE:
 * Client-side data fetching and actions for /superAdmin/admin-
 * management/[adminId]/edit (task-98, super_admin_account_
 * specification.md Section 3.2.3). Owns the loading/notFound/error
 * states (Rule 25) and wraps task-94's GET detail route plus task-95's
 * three mutations (PATCH edit, toggle-status, reset-password). Never
 * fetches directly inside the component (Rule 31.2). Mirrors
 * useAdminUserDetail.ts's shape — the closest sibling detail page —
 * including its choice not to send a CSRF header on these mutations,
 * since the admin-management API routes themselves don't check for
 * one (confirmed by reading those route files directly, Rule 0D).
 *
 * save() merges the returned name/permissions into local state.
 * setActive() merges the returned isActive flag, translated back into
 * this page's "active"/"inactive" status (never touches "locked" —
 * that state is display-only, computed server-side from recent login
 * failures, and has no toggle of its own; see lib/adminAccountStatus.ts's
 * header comment). resetPassword() doesn't change any displayed field.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminManagementDetailStatus = "active" | "inactive" | "locked";

export interface AdminManagementDetailData {
  adminId: string;
  email: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  createdBy: string | null;
  lastLogin: {
    at: string;
    ipAddress: string | null;
    geoCity: string | null;
    geoCountry: string | null;
  } | null;
  status: AdminManagementDetailStatus;
  permissions: string[];
}

interface FetchState {
  admin: AdminManagementDetailData | null;
  isLoading: boolean;
  notFound: boolean;
  error: string | null;
}

interface ActionResult {
  success: boolean;
  message: string;
}

export function useAdminManagementDetail(adminId: string) {
  const [state, setState] = useState<FetchState>({ admin: null, isLoading: true, notFound: false, error: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const fetchAdmin = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, notFound: false, error: null }));
    try {
      const response = await fetch(`/api/superadmin/admin-management/${adminId}`);
      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          setState({ admin: null, isLoading: false, notFound: true, error: null });
          return;
        }
        setState({ admin: null, isLoading: false, notFound: false, error: result.message });
        return;
      }
      setState({ admin: result.data, isLoading: false, notFound: false, error: null });
    } catch {
      setState({
        admin: null,
        isLoading: false,
        notFound: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, [adminId]);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  /**
   * save
   * PATCHes fullName/permissions (task-95's edit route). On success,
   * merges both fields into local state — no refetch needed since the
   * route returns the exact values it wrote.
   */
  const save = useCallback(
    async (fullName: string, permissions: string[]): Promise<ActionResult> => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/superadmin/admin-management/${adminId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, permissions }),
        });
        const result = await response.json();
        if (result.success) {
          setState((current) =>
            current.admin
              ? { ...current, admin: { ...current.admin, name: result.data.name, permissions: result.data.permissions } }
              : current
          );
        }
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsSaving(false);
      }
    },
    [adminId]
  );

  /**
   * setActive
   * Calls task-95's toggle-status route (deactivate/reactivate).
   * Merges the resulting status locally — "locked" is never set here,
   * since this action can only ever produce "active" or "inactive".
   */
  const setActive = useCallback(
    async (nextActive: boolean): Promise<ActionResult> => {
      setIsTogglingActive(true);
      try {
        const response = await fetch(`/api/superadmin/admin-management/${adminId}/toggle-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: nextActive ? "reactivate" : "deactivate" }),
        });
        const result = await response.json();
        if (result.success) {
          setState((current) =>
            current.admin ? { ...current, admin: { ...current.admin, status: nextActive ? "active" : "inactive" } } : current
          );
        }
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsTogglingActive(false);
      }
    },
    [adminId]
  );

  /**
   * resetPassword
   * Calls task-95's reset-password route. Nothing to merge locally —
   * no displayed field changes as a result.
   */
  const resetPassword = useCallback(async (): Promise<ActionResult> => {
    setIsResettingPassword(true);
    try {
      const response = await fetch(`/api/superadmin/admin-management/${adminId}/reset-password`, { method: "POST" });
      const result = await response.json();
      return { success: Boolean(result.success), message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    } finally {
      setIsResettingPassword(false);
    }
  }, [adminId]);

  return {
    ...state,
    isSaving,
    isTogglingActive,
    isResettingPassword,
    save,
    setActive,
    resetPassword,
  };
}
