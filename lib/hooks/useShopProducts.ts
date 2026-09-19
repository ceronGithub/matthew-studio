/**
 * FILE: lib/hooks/useShopProducts.ts
 * PURPOSE:
 * Client-side data fetching for the public /products grid (task-122).
 * Wraps GET /api/shop/products (task-121) so no component ever calls
 * fetch directly (Rule 31.2). Owns the search / category / sort /
 * page state and the loading + error states (Rule 25) — the "empty"
 * state is derived by the grid from `products.length === 0`.
 *
 * DATA FLOW:
 * 1. The grid calls setSearch / setCategory / setSortMode / goToPage.
 * 2. Search is debounced 300ms so every keystroke doesn't fire a
 *    request; category, sort, and page changes fetch immediately.
 *    Any filter change sends the visitor back to page 1.
 * 3. Each request is aborted if a newer one starts, so a slow old
 *    response can never overwrite a newer result.
 * 4. Products come back already in the storefront's `Product` shape
 *    (lib/publicProduct.ts), so ProductCard renders them unchanged.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/productsData";

export type ShopSortMode = "bestselling" | "newest" | "price-asc" | "price-desc" | "rating";

const SEARCH_DEBOUNCE_MS = 300;

interface FetchState {
  products: Product[];
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export function useShopProducts() {
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategoryState] = useState("all");
  const [sortMode, setSortModeState] = useState<ShopSortMode>("bestselling");
  const [page, setPage] = useState(1);
  // Bumped by refetch() so the "Try again" button re-runs the same query.
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<FetchState>({
    products: [],
    totalCount: 0,
    totalPages: 1,
    isLoading: true,
    error: null,
  });

  // Debounce the search box — wait until the visitor pauses typing.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch whenever the query changes. The cleanup aborts the in-flight
  // request so only the newest query's response is ever applied.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({ page: String(page), sort: sortMode });
        if (category !== "all") params.set("category", category);
        if (debouncedSearch) params.set("search", debouncedSearch);

        const response = await fetch(`/api/shop/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!result.success) {
          setState((current) => ({ ...current, isLoading: false, error: result.message }));
          return;
        }

        setState({
          // The API maps every row to the storefront's Product shape
          // (lib/publicProduct.ts), so this cast only narrows the two
          // string fields (category, iconName) to their known unions.
          products: result.data.products as Product[],
          totalCount: result.data.totalCount,
          totalPages: result.data.totalPages,
          isLoading: false,
          error: null,
        });
      } catch (fetchError) {
        // An aborted request means a newer one replaced it — not an error.
        if ((fetchError as Error).name === "AbortError") return;
        setState((current) => ({
          ...current,
          isLoading: false,
          error: "We couldn't reach the server. Check your connection and try again.",
        }));
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [page, category, sortMode, debouncedSearch, reloadCount]);

  const setSearch = useCallback((value: string) => setSearchState(value), []);

  const setCategory = useCallback((value: string) => {
    setCategoryState(value);
    setPage(1);
  }, []);

  const setSortMode = useCallback((value: ShopSortMode) => {
    setSortModeState(value);
    setPage(1);
  }, []);

  const goToPage = useCallback((nextPage: number) => setPage(nextPage), []);
  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  return {
    ...state,
    page,
    search,
    category,
    sortMode,
    setSearch,
    setCategory,
    setSortMode,
    goToPage,
    refetch,
  };
}
