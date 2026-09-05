/**
 * FILE: lib/hooks/useBuyerNotifications.ts
 * PURPOSE:
 * Client-side data fetching for the notification bell (BuyerNav) and
 * the /buyer/notifications page (Task 13). Owns loading/empty/error
 * state (Rule 25) plus the unread count so both call sites share one
 * source of truth instead of two separate fetches drifting apart.
 * Mirrors useBuyerSupportTickets.ts's shape — never calls fetch
 * directly inside a component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface BuyerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  linkHref: string | null;
  isRead: boolean;
  createdAt: string;
}

interface FetchState {
  notifications: BuyerNotification[];
  unreadCount: number;
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useBuyerNotifications() {
  const [state, setState] = useState<FetchState>({
    notifications: [],
    unreadCount: 0,
    totalPages: 1,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchNotifications = useCallback(async (page: number) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/buyer/notifications?page=${page}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        notifications: result.data.notifications,
        unreadCount: result.data.unreadCount,
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
    fetchNotifications(1);
  }, [fetchNotifications]);

  const goToPage = useCallback((page: number) => fetchNotifications(page), [fetchNotifications]);
  const refetch = useCallback(() => fetchNotifications(state.page), [fetchNotifications, state.page]);

  // Marks one notification read, then re-fetches so unreadCount and
  // the row's isRead flag both reflect the server rather than
  // guessing at optimistic local state (same choice as
  // useBuyerSupportTicketDetail.ts's reply/reopen actions).
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/buyer/notifications/${id}/read`, {
          method: "PUT",
          headers: getCsrfHeader(),
        });
        const result = await response.json();
        if (result.success) refetch();
        return result;
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [refetch]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/buyer/notifications/read-all", {
        method: "PUT",
        headers: getCsrfHeader(),
      });
      const result = await response.json();
      if (result.success) refetch();
      return result;
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }, [refetch]);

  return { ...state, goToPage, refetch, markAsRead, markAllAsRead };
}
