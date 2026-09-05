/**
 * FILE: lib/hooks/useAdminSupportTickets.ts
 * PURPOSE:
 * Client-side data fetching for /admin/support's ticket inbox (Task
 * 17). Owns the loading/empty/error states (Rule 25), the current
 * page number, and the active status filter — never calls fetch
 * directly inside the page/component (Rule 31.2). Mirrors
 * useBuyerSupportTickets.ts's shape, with the addition of a status
 * filter tab since the admin inbox spans every buyer's tickets and
 * needs a way to narrow the view (Section 2 of
 * admin_support_ticket_specification.md).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminTicketStatusFilter = "all" | "open" | "answered" | "closed";

export interface AdminSupportTicketListItem {
  id: string;
  subject: string;
  status: string;
  orderId: string | null;
  buyerEmail: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface FetchState {
  tickets: AdminSupportTicketListItem[];
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useAdminSupportTickets() {
  const [statusFilter, setStatusFilter] = useState<AdminTicketStatusFilter>("all");
  const [state, setState] = useState<FetchState>({
    tickets: [],
    totalPages: 1,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchTickets = useCallback(async (page: number, filter: AdminTicketStatusFilter) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const statusQuery = filter === "all" ? "" : `&status=${filter}`;
      const response = await fetch(`/api/admin/support/tickets?page=${page}${statusQuery}`);
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
    fetchTickets(1, statusFilter);
  }, [fetchTickets, statusFilter]);

  const goToPage = useCallback((page: number) => fetchTickets(page, statusFilter), [fetchTickets, statusFilter]);
  const refetch = useCallback(() => fetchTickets(state.page, statusFilter), [fetchTickets, state.page, statusFilter]);

  // Switching filters always resets to page 1 — a stale page number
  // from a different filter's result set would be meaningless here.
  const changeStatusFilter = useCallback((filter: AdminTicketStatusFilter) => {
    setStatusFilter(filter);
  }, []);

  return { ...state, statusFilter, changeStatusFilter, goToPage, refetch };
}
