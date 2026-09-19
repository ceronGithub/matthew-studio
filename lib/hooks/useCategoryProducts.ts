/**
 * FILE: lib/hooks/useCategoryProducts.ts
 * PURPOSE:
 * Client-side data fetching for a single homepage category section
 * (task-126..131 — GameCharactersSection, TShirtsSection, etc). Each
 * section used to read `PRODUCTS.filter(category === "...")` from the
 * static catalog; this hook wraps GET /api/shop/products?category=...
 * (task-121) instead, so a product an admin publishes shows up without
 * a code change.
 *
 * Deliberately smaller than useShopProducts.ts (Rule 31.4 — extract
 * only the logic actually needed): a homepage section has no search
 * box, sort dropdown, or pagination — it just shows every published
 * product in one category, same as the old static filter did.
 *
 * DATA FLOW:
 * 1. Fetches once per category on mount.
 * 2. The in-flight request is aborted if the component unmounts before
 *    it resolves (same abort pattern as useShopProducts.ts).
 * 3. Products come back already in the storefront's Product shape
 *    (lib/publicProduct.ts), so ProductCard renders them unchanged.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product, ProductCategorySlug } from "@/lib/productsData";

interface CategoryProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

export function useCategoryProducts(category: ProductCategorySlug) {
  // Bumped by refetch() so a "Try again" click re-runs the same query.
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<CategoryProductsState>({
    products: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategoryProducts() {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const response = await fetch(`/api/shop/products?category=${category}&sort=bestselling`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!result.success) {
          setState({ products: [], isLoading: false, error: result.message });
          return;
        }

        setState({
          products: result.data.products as Product[],
          isLoading: false,
          error: null,
        });
      } catch (fetchError) {
        // An aborted request means the component unmounted — not an error.
        if ((fetchError as Error).name === "AbortError") return;
        setState({
          products: [],
          isLoading: false,
          error: "We couldn't reach the server. Check your connection and try again.",
        });
      }
    }

    loadCategoryProducts();
    return () => controller.abort();
  }, [category, reloadCount]);

  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, refetch };
}
