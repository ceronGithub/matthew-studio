/**
 * FILE: lib/hooks/useAdminOrderDetail.ts
 * PURPOSE:
 * Client-side data fetching and actions for /admin/orders/[orderId]
 * (task-81, admin_account_specification.md Section 3.3.2). Owns the
 * loading/notFound/error states (Rule 25) and wraps the three
 * task-77 actions (update_status, refund, add_note) plus task-78's
 * send-email route. Never calls fetch directly inside the component
 * (Rule 31.2). Mirrors useBuyerOrderDetail.ts's shape.
 *
 * Each action updates local state from the action route's own
 * response rather than re-fetching the whole order, except
 * send-email (which doesn't change order data, so nothing to merge).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminOrderDetailItem {
  id: string;
  productId: string;
  name: string;
  category: string | null;
  categoryLabel: string | null;
  price: number;
  variant: string | null;
  quantity: number;
  subtotal: number;
}

export interface OrderTimelineEntry {
  status: string;
  note: string | null;
  adminId: string | null;
  at: string;
}

export interface InternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

export interface AdminOrderDetail {
  order: { id: string; status: string; createdAt: string; updatedAt: string };
  buyer: { userId: string | null; email: string | null; isGuest: boolean; accountCreatedAt: string | null };
  items: AdminOrderDetailItem[];
  hasTshirtItem: boolean;
  totals: { subtotal: number; shippingFee: number; total: number };
  payment: { method: string | null; status: string | null; transactionId: string | null; paidAt: string | null };
  timeline: OrderTimelineEntry[];
  internalNotes: InternalNoteEntry[];
  refund: { refundReason: string | null; refundedAt: string | null };
  shipping: { courier: string | null; trackingNumber: string | null; address: unknown };
  productionStage: string | null;
}

interface FetchState {
  order: AdminOrderDetail | null;
  isLoading: boolean;
  notFound: boolean;
  error: string | null;
}

interface ActionResult {
  success: boolean;
  message: string;
}

export function useAdminOrderDetail(orderId: string) {
  const [state, setState] = useState<FetchState>({ order: null, isLoading: true, notFound: false, error: null });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchOrder = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, notFound: false, error: null }));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          setState({ order: null, isLoading: false, notFound: true, error: null });
          return;
        }
        setState({ order: null, isLoading: false, notFound: false, error: result.message });
        return;
      }
      setState({ order: result.data, isLoading: false, notFound: false, error: null });
    } catch {
      setState({
        order: null,
        isLoading: false,
        notFound: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /**
   * updateStatus
   * Calls task-77's update_status action. On success, merges the new
   * status + statusHistory into local state — no full refetch needed.
   */
  const updateStatus = useCallback(
    async (status: string, note: string): Promise<ActionResult> => {
      setIsUpdatingStatus(true);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_status", status, note }),
        });
        const result = await response.json();
        if (result.success) {
          setState((current) =>
            current.order
              ? {
                  ...current,
                  order: {
                    ...current.order,
                    order: { ...current.order.order, status: result.data.status },
                    timeline: result.data.statusHistory,
                  },
                }
              : current
          );
        }
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [orderId]
  );

  /**
   * refund
   * Calls task-77's refund action. Flips status to "Cancelled" and
   * records the reason — merges the result the same way updateStatus does.
   */
  const refund = useCallback(
    async (refundReason: string): Promise<ActionResult> => {
      setIsRefunding(true);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refund", refundReason }),
        });
        const result = await response.json();
        if (result.success) {
          setState((current) =>
            current.order
              ? {
                  ...current,
                  order: {
                    ...current.order,
                    order: { ...current.order.order, status: result.data.status },
                    refund: { refundReason: result.data.refundReason, refundedAt: result.data.refundedAt },
                  },
                }
              : current
          );
        }
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      } finally {
        setIsRefunding(false);
      }
    },
    [orderId]
  );

  /**
   * addNote
   * Calls task-77's add_note action. Internal-only — never notifies
   * the buyer. Merges the returned notes array into local state.
   */
  const addNote = useCallback(
    async (note: string): Promise<ActionResult> => {
      setIsAddingNote(true);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_note", note }),
        });
        const result = await response.json();
        if (result.success) {
          setState((current) =>
            current.order ? { ...current, order: { ...current.order, internalNotes: result.data.internalNotes } } : current
          );
        }
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      } finally {
        setIsAddingNote(false);
      }
    },
    [orderId]
  );

  /**
   * sendBuyerEmail
   * Calls task-78's send-email route. Nothing to merge locally — this
   * doesn't change any order field.
   */
  const sendBuyerEmail = useCallback(
    async (preset: string, subject: string, body: string): Promise<ActionResult> => {
      setIsSendingEmail(true);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset, subject, body }),
        });
        const result = await response.json();
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Please try again." };
      } finally {
        setIsSendingEmail(false);
      }
    },
    [orderId]
  );

  return {
    ...state,
    isUpdatingStatus,
    isRefunding,
    isAddingNote,
    isSendingEmail,
    refetch: fetchOrder,
    updateStatus,
    refund,
    addNote,
    sendBuyerEmail,
  };
}
