/**
 * FILE: lib/hooks/useBuyerOrders.ts
 * PURPOSE:
 * Client-side data fetching for /buyer/orders
 * (buyer_order_tracking_specification.md Section 3.1/5). Owns the
 * loading/empty/error states (Rule 25) and the current page number —
 * never calls fetch directly inside the page/component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface BuyerOrderListItem {
  id: string;
  shortId: string;
  firstItemName: string;
  firstItemCategory: string | null;
  firstItemIconName: string | null;
  itemCount: number;
  total: number;
  status: string;
  productionStage: string | null;
  createdAt: string;
}

interface FetchState {
  orders: BuyerOrderListItem[];
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useBuyerOrders() {
  const [state, setState] = useState<FetchState>({
    orders: [],
    totalPages: 1,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchOrders = useCallback(async (page: number) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/buyer/orders?page=${page}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        orders: result.data.orders,
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
  }, []);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const goToPage = useCallback((page: number) => fetchOrders(page), [fetchOrders]);
  const refetch = useCallback(() => fetchOrders(state.page), [fetchOrders, state.page]);

  return { ...state, goToPage, refetch };
}
