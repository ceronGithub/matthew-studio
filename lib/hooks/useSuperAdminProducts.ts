/**
 * FILE: lib/hooks/useSuperAdminProducts.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/products (task-112,
 * super_admin_account_specification.md Section 9.2). Owns the
 * loading/empty/error states (Rule 25), pagination, the status
 * filter (defaults to "pending-review"), and the approve/reject
 * row actions — never calls fetch directly inside the page/component
 * (Rule 31.2). Mirrors lib/hooks/useAdminUsers.ts's shape.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface SuperAdminProductListItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  startingPrice: number;
  status: string;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SuperAdminProductFilters {
  status: string; // "" means all statuses; defaults to "pending-review"
  search: string;
}

interface FetchState {
  products: SuperAdminProductListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_FILTERS: SuperAdminProductFilters = { status: "pending-review", search: "" };

function buildQuery(page: number, filters: SuperAdminProductFilters): string {
  const params = new URLSearchParams({ page: String(page), status: filters.status });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export function useSuperAdminProducts() {
  const [filters, setFilters] = useState<SuperAdminProductFilters>(DEFAULT_FILTERS);
  const [state, setState] = useState<FetchState>({
    products: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchProducts = useCallback(async (page: number, currentFilters: SuperAdminProductFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/superadmin/products?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        products: result.data.products,
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
    fetchProducts(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback((page: number) => fetchProducts(page, filters), [fetchProducts, filters]);
  const refetch = useCallback(() => fetchProducts(state.page, filters), [fetchProducts, state.page, filters]);

  const updateFilters = useCallback((partial: Partial<SuperAdminProductFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /**
   * approveProduct / rejectProduct
   * Calls task-111's PATCH endpoints. Refetches the current page on
   * success so an approved/rejected row disappears from the (still
   * pending-review-filtered) list immediately.
   */
  const approveProduct = useCallback(
    async (productId: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/superadmin/products/${productId}/approve`, { method: "PATCH" });
        const result = await response.json();
        if (result.success) refetch();
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      }
    },
    [refetch]
  );

  const rejectProduct = useCallback(
    async (productId: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/superadmin/products/${productId}/reject`, { method: "PATCH" });
        const result = await response.json();
        if (result.success) refetch();
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      }
    },
    [refetch]
  );

  return {
    ...state,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
    approveProduct,
    rejectProduct,
  };
}
