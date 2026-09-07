/**
 * FILE: lib/hooks/useAdminOrders.ts
 * PURPOSE:
 * Client-side data fetching for /admin/orders (task-80,
 * admin_account_specification.md Section 3.3.1). Owns the
 * loading/empty/error states (Rule 25), pagination, the active
 * filters (status/date range/search), row selection for bulk
 * actions, and CSV export — never calls fetch directly inside the
 * page/component (Rule 31.2). Mirrors useAdminSupportTickets.ts's
 * shape.
 *
 * Bulk status update reuses the existing single-order
 * POST /api/admin/orders/[orderId]/actions endpoint (task-77) — one
 * request per selected order, run in parallel — rather than adding a
 * new bulk API route. Task-80 is scoped to the UI layer only per
 * Rule 49 Step 4; a dedicated bulk endpoint would be its own
 * micro-task if this fan-out pattern ever becomes a performance
 * problem.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminOrderListItem {
  id: string;
  buyerEmail: string | null;
  total: number;
  status: string;
  paymentStatus: string | null;
  createdAt: string;
}

export interface AdminOrderFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface FetchState {
  orders: AdminOrderListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_FILTERS: AdminOrderFilters = { status: "", dateFrom: "", dateTo: "", search: "" };

function buildQuery(page: number, filters: AdminOrderFilters, extra?: Record<string, string>): string {
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

export function useAdminOrders() {
  const [filters, setFilters] = useState<AdminOrderFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<FetchState>({
    orders: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchOrders = useCallback(async (page: number, currentFilters: AdminOrderFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/admin/orders?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        orders: result.data.orders,
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
    fetchOrders(1, filters);
    // Filters changing always resets to page 1 and clears any
    // selection made under a different filtered result set.
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback((page: number) => fetchOrders(page, filters), [fetchOrders, filters]);
  const refetch = useCallback(() => fetchOrders(state.page, filters), [fetchOrders, state.page, filters]);

  const updateFilters = useCallback((partial: Partial<AdminOrderFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /**
   * toggleSelect / toggleSelectAll / clearSelection
   * Row-selection state for the bulk status-update action bar.
   */
  const toggleSelect = useCallback((orderId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === state.orders.length ? new Set() : new Set(state.orders.map((order) => order.id))
    );
  }, [state.orders]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /**
   * exportCsv
   * Requests the same list endpoint with format=csv (current filters
   * applied) and triggers a browser download of the returned file —
   * never re-implements the export logic client-side.
   */
  const exportCsv = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`/api/admin/orders?${buildQuery(1, filters, { format: "csv" })}`);
      if (!response.ok) {
        return { success: false, message: "We couldn't export orders. Please try again." };
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
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
   * bulkUpdateStatus
   * Applies one status to every selected order via the existing
   * per-order actions endpoint, run in parallel. Reports how many
   * succeeded vs failed so the caller can show an accurate toast
   * (Rule 22 — success vs warning vs error) rather than assuming
   * all-or-nothing.
   */
  const bulkUpdateStatus = useCallback(
    async (status: string): Promise<{ succeeded: number; failed: number }> => {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map(async (orderId) => {
          try {
            const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "update_status", status }),
            });
            const result = await response.json();
            return Boolean(result.success);
          } catch {
            return false;
          }
        })
      );
      const succeeded = results.filter(Boolean).length;
      clearSelection();
      await fetchOrders(state.page, filters);
      return { succeeded, failed: results.length - succeeded };
    },
    [selectedIds, clearSelection, fetchOrders, state.page, filters]
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
    bulkUpdateStatus,
  };
}
