/**
 * FILE: lib/hooks/useAdminUsers.ts
 * PURPOSE:
 * Client-side data fetching for /admin/users (task-87,
 * admin_account_specification.md Section 3.4.1). Owns the
 * loading/empty/error states (Rule 25), pagination, the active
 * filters (status/date range/search), row selection for bulk
 * actions, and CSV export — never calls fetch directly inside the
 * page/component (Rule 31.2). Mirrors useAdminOrders.ts's shape.
 *
 * Bulk deactivate/reactivate reuses the existing single-buyer
 * POST /api/admin/users/[buyerId]/actions endpoint (task-86) — one
 * request per selected buyer, run in parallel — rather than adding a
 * new bulk API route, same fan-out precedent as useAdminOrders.ts's
 * bulkUpdateStatus.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminUserListItem {
  userId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  totalOrders: number;
  lifetimeValue: number;
}

export interface AdminUserFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface FetchState {
  buyers: AdminUserListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_FILTERS: AdminUserFilters = { status: "", dateFrom: "", dateTo: "", search: "" };

function buildQuery(page: number, filters: AdminUserFilters, extra?: Record<string, string>): string {
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

export function useAdminUsers() {
  const [filters, setFilters] = useState<AdminUserFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<FetchState>({
    buyers: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchBuyers = useCallback(async (page: number, currentFilters: AdminUserFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/admin/users?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        buyers: result.data.buyers,
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
    fetchBuyers(1, filters);
    // Filters changing always resets to page 1 and clears any
    // selection made under a different filtered result set.
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback((page: number) => fetchBuyers(page, filters), [fetchBuyers, filters]);
  const refetch = useCallback(() => fetchBuyers(state.page, filters), [fetchBuyers, state.page, filters]);

  const updateFilters = useCallback((partial: Partial<AdminUserFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /**
   * toggleSelect / toggleSelectAll / clearSelection
   * Row-selection state for the bulk deactivate/reactivate action bar.
   */
  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === state.buyers.length ? new Set() : new Set(state.buyers.map((buyer) => buyer.userId))
    );
  }, [state.buyers]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /**
   * exportCsv
   * Requests the same list endpoint with format=csv (current filters
   * applied) and triggers a browser download of the returned file —
   * never re-implements the export logic client-side.
   */
  const exportCsv = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`/api/admin/users?${buildQuery(1, filters, { format: "csv" })}`);
      if (!response.ok) {
        return { success: false, message: "We couldn't export buyers. Please try again." };
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `buyers-export-${new Date().toISOString().slice(0, 10)}.csv`;
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
   * runAction
   * Calls task-86's single-buyer actions endpoint for one buyer.
   * Shared by the per-row buttons and bulkSetActive below so there is
   * one place that knows the request shape.
   */
  const runAction = useCallback(
    async (userId: string, body: Record<string, unknown>): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    []
  );

  /**
   * setActive
   * Single-row deactivate/reactivate. Re-fetches the current page
   * afterward so the Status column and any date-derived filter stay
   * accurate rather than patching local state optimistically.
   */
  const setActive = useCallback(
    async (userId: string, active: boolean): Promise<{ success: boolean; message?: string }> => {
      const result = await runAction(userId, { action: active ? "reactivate" : "deactivate" });
      if (result.success) await fetchBuyers(state.page, filters);
      return result;
    },
    [runAction, fetchBuyers, state.page, filters]
  );

  /**
   * bulkSetActive
   * Applies deactivate or reactivate to every selected buyer via the
   * existing per-buyer actions endpoint, run in parallel. Reports how
   * many succeeded vs failed so the caller can show an accurate toast
   * (Rule 22 — success vs warning vs error) rather than assuming
   * all-or-nothing.
   */
  const bulkSetActive = useCallback(
    async (active: boolean): Promise<{ succeeded: number; failed: number }> => {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map((userId) => runAction(userId, { action: active ? "reactivate" : "deactivate" })));
      const succeeded = results.filter((result) => result.success).length;
      clearSelection();
      await fetchBuyers(state.page, filters);
      return { succeeded, failed: results.length - succeeded };
    },
    [selectedIds, runAction, clearSelection, fetchBuyers, state.page, filters]
  );

  /**
   * resetPassword
   * Single-row "send a password reset email" action (task-86's
   * reset_password). Nothing to merge locally — the buyer's status
   * doesn't change, so no re-fetch is needed.
   */
  const resetPassword = useCallback(
    (userId: string) => runAction(userId, { action: "reset_password" }),
    [runAction]
  );

  /**
   * sendEmail
   * Single-row "compose and send a custom email" action (task-86's
   * send_email). Nothing to merge locally.
   */
  const sendEmail = useCallback(
    (userId: string, subject: string, body: string) => runAction(userId, { action: "send_email", subject, body }),
    [runAction]
  );

  return {
    ...state,
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
  };
}
