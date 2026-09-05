/**
 * FILE: lib/hooks/useBuyerSupportTicketDetail.ts
 * PURPOSE:
 * Client-side data fetching + mutations for /buyer/support/[ticketId]
 * (Task 10). Owns the loading/error state for the initial fetch
 * (Rule 25) plus isReplying/isReopening for the two mutation actions
 * — never calls fetch directly inside the component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface TicketMessageItem {
  id: string;
  senderRole: string; // "buyer" | "admin"
  body: string;
  createdAt: string;
}

export interface SupportTicketDetail {
  id: string;
  subject: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageItem[];
}

interface FetchState {
  ticket: SupportTicketDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function useBuyerSupportTicketDetail(ticketId: string) {
  const [state, setState] = useState<FetchState>({ ticket: null, isLoading: true, error: null });
  const [isReplying, setIsReplying] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const fetchTicket = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/buyer/support/${ticketId}`);
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
   * Posts a new buyer message to the thread. Re-fetches the ticket on
   * success so the new message and any status flip (closed → open)
   * both reflect the server's authoritative state, rather than
   * optimistically guessing the new status client-side.
   */
  const sendReply = useCallback(
    async (message: string): Promise<{ success: boolean; message: string }> => {
      setIsReplying(true);
      try {
        const response = await fetch(`/api/buyer/support/${ticketId}/reply`, {
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
   * reopenTicket
   * Standalone reopen action (separate from replying, which
   * auto-reopens as a side effect on the server). Re-fetches on
   * success for the same reason as sendReply.
   */
  const reopenTicket = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsReopening(true);
    try {
      const response = await fetch(`/api/buyer/support/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
      });
      const result = await response.json();
      if (result.success) await fetchTicket();
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    } finally {
      setIsReopening(false);
    }
  }, [ticketId, fetchTicket]);

  return { ...state, refetch: fetchTicket, sendReply, isReplying, reopenTicket, isReopening };
}
