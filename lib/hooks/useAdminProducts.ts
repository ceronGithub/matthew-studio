/**
 * FILE: lib/hooks/useAdminProducts.ts
 * PURPOSE:
 * Client-side data fetching for /admin/products (Task 22). Owns the
 * loading/empty/error states (Rule 25), pagination, and the
 * category/status/search filters — never calls fetch directly inside
 * the page/component (Rule 31.2). Mirrors useAdminSupportTickets.ts's
 * shape; adds deleteProduct() since the list page is also where the
 * Delete action (behind ConfirmationModal, Rule 34.4) lives.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface AdminProductListItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  startingPrice: number;
  status: string;
  badge: string | null;
  createdAt: string;
  updatedAt: string;
  coverImageUrl: string | null;
}

interface FetchState {
  products: AdminProductListItem[];
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useAdminProducts() {
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    products: [],
    totalPages: 1,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchProducts = useCallback(
    async (page: number, categoryFilter: string, statusFilter: string, searchTerm: string) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (searchTerm.trim()) params.set("search", searchTerm.trim());

        const response = await fetch(`/api/admin/products?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          setState((current) => ({ ...current, isLoading: false, error: result.message }));
          return;
        }
        setState({
          products: result.data.products,
          totalPages: result.data.totalPages,
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
    },
    []
  );

  // Search is debounced client-side (300ms) so every keystroke doesn't
  // fire a request — same "don't fetch on every keystroke" intent as
  // Rule 34.2's loading-timing standard, applied to input instead.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts(1, category, status, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchProducts, category, status, search]);

  const goToPage = useCallback(
    (page: number) => fetchProducts(page, category, status, search),
    [fetchProducts, category, status, search]
  );
  const refetch = useCallback(
    () => fetchProducts(state.page, category, status, search),
    [fetchProducts, state.page, category, status, search]
  );

  async function deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { ...getCsrfHeader() },
      });
      const result = await response.json();
      if (result.success) {
        await fetchProducts(state.page, category, status, search);
      }
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }

  return {
    ...state,
    category,
    status,
    search,
    setCategory,
    setStatus,
    setSearch,
    goToPage,
    refetch,
    deleteProduct,
  };
}
