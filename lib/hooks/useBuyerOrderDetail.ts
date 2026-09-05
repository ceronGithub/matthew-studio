/**
 * FILE: lib/hooks/useBuyerOrderDetail.ts
 * PURPOSE:
 * Client-side data fetching and actions for
 * /buyer/orders/[orderId] (buyer_order_tracking_specification.md
 * Section 3.2/5). Owns loading/notFound/error states (Rule 25),
 * plus the Cancel and Reorder actions. Never calls fetch directly
 * inside the component (Rule 31.2).
 *
 * Reorder note: the buyer account area (app/buyer/layout.tsx) is not
 * wrapped in CartContext (that provider only wraps app/(public)/layout.tsx,
 * since the cart is a shopping-flow feature) — so this hook calls
 * POST /api/cart directly, one request per line item, rather than
 * useCart(). After a successful reorder it redirects to /checkout,
 * which IS inside CartProvider and will hydrate the cart it just
 * populated.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface OrderTimelineStep {
  key: string;
  label: string;
  completedAt: string | null;
  isCurrent?: boolean;
}

export interface OrderDetailItem {
  productId: string;
  name: string;
  category: string | null;
  iconName: string | null;
  price: number;
  variant: string | null;
  quantity: number;
  subtotal: number;
}

export interface OrderDetail {
  orderId: string;
  shortId: string;
  status: string;
  productionStage: string | null;
  createdAt: string;
  timeline: OrderTimelineStep[];
  items: OrderDetailItem[];
  payment: { method: string | null; status: string };
  summary: { subtotal: number; shippingFee: number; total: number };
  shipping: { address: unknown; courier: string | null; trackingNumber: string | null } | null;
  canCancel: boolean;
  canReorder: boolean;
}

interface FetchState {
  order: OrderDetail | null;
  isLoading: boolean;
  notFound: boolean;
  error: string | null;
}

export function useBuyerOrderDetail(orderId: string) {
  const router = useRouter();
  const [state, setState] = useState<FetchState>({ order: null, isLoading: true, notFound: false, error: null });
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const fetchOrder = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, notFound: false, error: null }));
    try {
      const response = await fetch(`/api/buyer/orders/${orderId}`);
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
   * cancelOrder
   * Calls the cancel endpoint and refreshes local state on success.
   * Returns { success, message } so the component can drive its own
   * toast (Rule 22) without this hook importing useToast itself.
   */
  const cancelOrder = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/buyer/orders/${orderId}/cancel`, { method: "PUT" });
      const result = await response.json();
      if (result.success) {
        setState((current) =>
          current.order ? { ...current, order: { ...current.order, status: result.data.status, canCancel: false } } : current
        );
      }
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Please try again." };
    } finally {
      setIsCancelling(false);
    }
  }, [orderId]);

  /**
   * reorder
   * Adds every line item from this order to the cart (one POST per
   * item, same variant/quantity as originally purchased), then
   * redirects to /checkout on success.
   */
  const reorder = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!state.order) return { success: false, message: "Order not loaded." };
    setIsReordering(true);
    try {
      const results = await Promise.all(
        state.order.items.map((item) =>
          fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: item.productId, variant: item.variant, quantity: item.quantity }),
          }).then((response) => response.json())
        )
      );

      const allSucceeded = results.every((result) => result.success);
      if (allSucceeded) {
        setTimeout(() => router.push("/checkout"), 900);
        return { success: true, message: "Items added to your cart." };
      }
      return { success: false, message: "Some items couldn't be added to your cart. Please try again." };
    } catch {
      return { success: false, message: "We couldn't reach the server. Please try again." };
    } finally {
      setIsReordering(false);
    }
  }, [state.order, router]);

  return { ...state, isCancelling, isReordering, refetch: fetchOrder, cancelOrder, reorder };
}
