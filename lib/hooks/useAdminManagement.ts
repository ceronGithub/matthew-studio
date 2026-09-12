/**
 * FILE: lib/hooks/useAdminManagement.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/admin-management (task-96,
 * super_admin_account_specification.md Section 3.2.1). Owns the
 * loading/empty/error states (Rule 25), pagination, the active
 * filters (status/date range/search), and CSV export against the
 * already-live API half — GET /api/superadmin/admin-management
 * (task-94) plus its toggle-status/reset-password/DELETE mutations
 * (task-95). Never fetches directly inside a component (Rule 31.2).
 * Mirrors useAdminUsers.ts's shape — the closest sibling list page —
 * including its choice not to send a CSRF header on these mutations,
 * since the admin-management API routes themselves don't check for
 * one (same as the buyer-actions routes useAdminUsers.ts calls).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminAccountStatus = "active" | "inactive" | "locked";

export interface AdminManagementListItem {
  adminId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  createdBy: string | null;
  lastLoginAt: string | null;
  status: AdminAccountStatus;
  permissions: string[];
}

export interface AdminManagementFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface FetchState {
  admins: AdminManagementListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_FILTERS: AdminManagementFilters = { status: "", dateFrom: "", dateTo: "", search: "" };

function buildQuery(page: number, filters: AdminManagementFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  return params.toString();
}

export function useAdminManagement() {
  const [filters, setFilters] = useState<AdminManagementFilters>(EMPTY_FILTERS);
  const [state, setState] = useState<FetchState>({
    admins: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchAdmins = useCallback(async (page: number, currentFilters: AdminManagementFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/superadmin/admin-management?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        admins: result.data.admins,
        totalPages: result.data.totalPages,
        totalCount: result.data.totalCount,
        page: result.data.page,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      }));
    }
  }, []);

  useEffect(() => {
    fetchAdmins(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback((page: number) => fetchAdmins(page, filters), [fetchAdmins, filters]);
  const refetch = useCallback(() => fetchAdmins(state.page, filters), [fetchAdmins, state.page, filters]);

  const updateFilters = useCallback((partial: Partial<AdminManagementFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /**
   * exportCsv
   * Requests the same list endpoint with format=csv (current filters
   * applied) and triggers a browser download of the returned file —
   * never re-implements the export logic client-side (task-94 already
   * builds the CSV server-side).
   */
  const exportCsv = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`/api/superadmin/admin-management?${buildQuery(1, filters, { format: "csv" })}`);
      if (!response.ok) {
        return { success: false, message: "We couldn't export admin accounts. Please try again." };
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-management-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }, [filters]);

  /**
   * setActive
   * Single-row deactivate/reactivate via task-95's toggle-status
   * route. Re-fetches the current page afterward so the Status column
   * (and any status filter in effect) stays accurate.
   */
  const setActive = useCallback(
    async (adminId: string, active: boolean): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/superadmin/admin-management/${adminId}/toggle-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: active ? "reactivate" : "deactivate" }),
        });
        const result = await response.json();
        if (result.success) await fetchAdmins(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [fetchAdmins, state.page, filters]
  );

  /**
   * resetPassword
   * Single-row "send a fresh temp password" action (task-95's
   * reset-password route). Nothing to merge locally — status doesn't
   * change, so no re-fetch is needed.
   */
  const resetPassword = useCallback(async (adminId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`/api/superadmin/admin-management/${adminId}/reset-password`, {
        method: "POST",
      });
      const result = await response.json();
      return { success: Boolean(result.success), message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }, []);

  /**
   * deleteAdmin
   * Permanent delete via task-95's DELETE route. Re-fetches the
   * current page afterward so the removed row disappears immediately
   * rather than waiting for the next filter change.
   */
  const deleteAdmin = useCallback(
    async (adminId: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/superadmin/admin-management/${adminId}`, { method: "DELETE" });
        const result = await response.json();
        if (result.success) await fetchAdmins(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [fetchAdmins, state.page, filters]
  );

  return {
    ...state,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
    exportCsv,
    setActive,
    resetPassword,
    deleteAdmin,
  };
}
