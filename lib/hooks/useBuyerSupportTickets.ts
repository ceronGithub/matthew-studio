/**
 * FILE: lib/hooks/useBuyerSupportTickets.ts
 * PURPOSE:
 * Client-side data fetching for /buyer/support's ticket list (Task
 * 09). Owns the loading/empty/error states (Rule 25) and the current
 * page number — never calls fetch directly inside the page/component
 * (Rule 31.2). Mirrors useBuyerOrders.ts's shape exactly since the
 * API route (app/api/buyer/support/route.ts) follows the same
 * page/totalPages/totalCount response shape.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface BuyerSupportTicketListItem {
  id: string;
  subject: string;
  status: string;
  orderId: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface FetchState {
  tickets: BuyerSupportTicketListItem[];
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useBuyerSupportTickets() {
  const [state, setState] = useState<FetchState>({
    tickets: [],
    totalPages: 1,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchTickets = useCallback(async (page: number) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/buyer/support?page=${page}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        tickets: result.data.tickets,
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
    fetchTickets(1);
  }, [fetchTickets]);

  const goToPage = useCallback((page: number) => fetchTickets(page), [fetchTickets]);
  const refetch = useCallback(() => fetchTickets(state.page), [fetchTickets, state.page]);

  return { ...state, goToPage, refetch };
}
