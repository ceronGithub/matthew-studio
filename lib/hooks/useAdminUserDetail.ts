/**
 * FILE: lib/hooks/useAdminUserDetail.ts
 * PURPOSE:
 * Client-side data fetching and actions for /admin/users/[buyerId]
 * (task-88, admin_account_specification.md Section 3.4.2). Owns the
 * loading/notFound/error states (Rule 25) and wraps task-86's five
 * grouped actions (deactivate, reactivate, reset_password, send_email,
 * add_note). Never calls fetch directly inside the component
 * (Rule 31.2). Mirrors useAdminOrderDetail.ts's shape.
 *
 * deactivate/reactivate merge the returned isActive flag into local
 * state; add_note merges the returned notes array. reset_password and
 * send_email don't change any displayed field, so nothing is merged
 * for those beyond the action's own success/message result.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminUserOrderSummary {
  id: string;
  createdAt: string;
  total: number;
  status: string;
}

export interface AdminUserActivityEntry {
  action: string;
  ipAddress: string | null;
  geoCity: string | null;
  deviceType: string | null;
  createdAt: string;
}

export interface AdminUserInternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

export interface AdminUserDetail {
  account: {
    userId: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    createdAt: string;
    isActive: boolean;
    lastLogin: {
      at: string;
      ipAddress: string | null;
      geoCity: string | null;
      geoCountry: string | null;
    } | null;
  };
  orders: AdminUserOrderSummary[];
  activity: AdminUserActivityEntry[];
  internalNotes: AdminUserInternalNoteEntry[];
}

interface FetchState {
  buyer: AdminUserDetail | null;
  isLoading: boolean;
  notFound: boolean;
  error: string | null;
}

interface ActionResult {
  success: boolean;
  message: string;
}

export function useAdminUserDetail(buyerId: string) {
  const [state, setState] = useState<FetchState>({ buyer: null, isLoading: true, notFound: false, error: null });
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const fetchBuyer = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, notFound: false, error: null }));
    try {
      const response = await fetch(`/api/admin/users/${buyerId}`);
      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          setState({ buyer: null, isLoading: false, notFound: true, error: null });
          return;
        }
        setState({ buyer: null, isLoading: false, notFound: false, error: result.message });
        return;
      }
      setState({ buyer: result.data, isLoading: false, notFound: false, error: null });
    } catch {
      setState({
        buyer: null,
        isLoading: false,
        notFound: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, [buyerId]);

  useEffect(() => {
    fetchBuyer();
  }, [fetchBuyer]);

  /**
   * postAction
   * Shared POST helper for every task-86 action — keeps the fetch call,
   * JSON parsing, and network-error fallback in one place.
   */
  const postAction = useCallback(
    async (body: Record<string, unknown>): Promise<{ success: boolean; message: string; data?: unknown }> => {
      try {
        const response = await fetch(`/api/admin/users/${buyerId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        return { success: result.success, message: result.message, data: result.data };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      }
    },
    [buyerId]
  );

  /**
   * setActive
   * Calls task-86's "deactivate"/"reactivate" action. On success,
   * merges the returned isActive flag into local state — no refetch.
   */
  const setActive = useCallback(
    async (nextActive: boolean): Promise<ActionResult> => {
      setIsTogglingActive(true);
      const result = await postAction({ action: nextActive ? "reactivate" : "deactivate" });
      if (result.success) {
        setState((current) =>
          current.buyer
            ? { ...current, buyer: { ...current.buyer, account: { ...current.buyer.account, isActive: nextActive } } }
            : current
        );
      }
      setIsTogglingActive(false);
      return { success: result.success, message: result.message };
    },
    [postAction]
  );

  /**
   * resetPassword
   * Calls task-86's "reset_password" action. Nothing to merge locally
   * — the buyer's own password isn't part of this view.
   */
  const resetPassword = useCallback(async (): Promise<ActionResult> => {
    setIsResettingPassword(true);
    const result = await postAction({ action: "reset_password" });
    setIsResettingPassword(false);
    return { success: result.success, message: result.message };
  }, [postAction]);

  /**
   * sendBuyerEmail
   * Calls task-86's "send_email" action.
   */
  const sendBuyerEmail = useCallback(
    async (subject: string, body: string): Promise<ActionResult> => {
      setIsSendingEmail(true);
      const result = await postAction({ action: "send_email", subject, body });
      setIsSendingEmail(false);
      return { success: result.success, message: result.message };
    },
    [postAction]
  );

  /**
   * addNote
   * Calls task-86's "add_note" action. Merges the returned notes array.
   */
  const addNote = useCallback(
    async (note: string): Promise<ActionResult> => {
      setIsAddingNote(true);
      const result = await postAction({ action: "add_note", note });
      if (result.success) {
        const updatedNotes = (result.data as { internalNotes?: AdminUserInternalNoteEntry[] } | undefined)
          ?.internalNotes;
        if (updatedNotes) {
          setState((current) =>
            current.buyer ? { ...current, buyer: { ...current.buyer, internalNotes: updatedNotes } } : current
          );
        }
      }
      setIsAddingNote(false);
      return { success: result.success, message: result.message };
    },
    [postAction]
  );

  return {
    ...state,
    isTogglingActive,
    isResettingPassword,
    isSendingEmail,
    isAddingNote,
    refetch: fetchBuyer,
    setActive,
    resetPassword,
    sendBuyerEmail,
    addNote,
  };
}
