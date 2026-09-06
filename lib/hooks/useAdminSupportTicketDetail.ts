/**
 * FILE: lib/hooks/useAdminSupportTicketDetail.ts
 * PURPOSE:
 * Client-side data fetching + mutations for
 * /admin/support/[ticketId] (Task 18). Same shape as
 * useBuyerSupportTicketDetail.ts, with a closeTicket() mutation
 * instead of reopenTicket() — the admin-side counterpart action per
 * admin_support_ticket_specification.md Section 2. Owns the
 * loading/error state for the initial fetch (Rule 25) plus
 * isReplying/isClosing for the two mutation actions — never calls
 * fetch directly inside the component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface AdminTicketMessageItem {
  id: string;
  senderRole: string; // "buyer" | "admin"
  body: string;
  createdAt: string;
}

export interface AdminSupportTicketDetail {
  id: string;
  subject: string;
  status: string;
  orderId: string | null;
  buyerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AdminTicketMessageItem[];
}

interface FetchState {
  ticket: AdminSupportTicketDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminSupportTicketDetail(ticketId: string) {
  const [state, setState] = useState<FetchState>({ ticket: null, isLoading: true, error: null });
  const [isReplying, setIsReplying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchTicket = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`);
      const result = await response.json();

      if (!result.success) {
        setState({ ticket: null, isLoading: false, error: result.message });
        return;
      }
      setState({ ticket: result.data, isLoading: false, error: null });
    } catch {
      setState({
        ticket: null,
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  /**
   * sendReply
   * Posts a new admin message to the thread. Re-fetches the ticket on
   * success so the new message and the server-set "answered" status
   * both reflect the authoritative state, rather than optimistically
   * guessing client-side.
   */
  const sendReply = useCallback(
    async (message: string): Promise<{ success: boolean; message: string }> => {
      setIsReplying(true);
      try {
        const response = await fetch(`/api/admin/support/tickets/${ticketId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ message }),
        });
        const result = await response.json();
        if (result.success) await fetchTicket();
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsReplying(false);
      }
    },
    [ticketId, fetchTicket]
  );

  /**
   * closeTicket
   * Manual close action (Rule 34.4 gates this behind a confirmation
   * modal in the component). Re-fetches on success for the same
   * reason as sendReply.
   */
  const closeTicket = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsClosing(true);
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ status: "closed" }),
      });
      const result = await response.json();
      if (result.success) await fetchTicket();
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    } finally {
      setIsClosing(false);
    }
  }, [ticketId, fetchTicket]);

  return { ...state, refetch: fetchTicket, sendReply, isReplying, closeTicket, isClosing };
}
