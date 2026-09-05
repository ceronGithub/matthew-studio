/**
 * FILE: lib/hooks/useBuyerPaymentMethods.ts
 * PURPOSE:
 * Client-side data fetching and mutations for /buyer/payment-methods
 * (buyer_account_specification.md Section 4.3). Owns the
 * loading/empty/error states (Rule 25) for the initial list fetch;
 * each mutation reports its own success/message so the caller can
 * show the right toast without duplicating error text (same shape as
 * useBuyerProfile.ts).
 *
 * addStart/addFinalize are the two phases of
 * app/api/buyer/payment-methods/route.ts's single POST route — see
 * that file's header comment for why vaulting a card needs two
 * calls instead of one.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface SavedPaymentMethod {
  id: string;
  paymongoPaymentMethodId: string;
  maskedLabel: string;
  isDefault: boolean;
  createdAt: string;
}

interface FetchState {
  methods: SavedPaymentMethod[];
  isLoading: boolean;
  error: string | null;
}

interface MutationResult {
  success: boolean;
  message: string;
}

export function useBuyerPaymentMethods() {
  const [state, setState] = useState<FetchState>({ methods: [], isLoading: true, error: null });

  const fetchMethods = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/buyer/payment-methods");
      const result = await response.json();

      if (!result.success) {
        setState({ methods: [], isLoading: false, error: result.message });
        return;
      }
      setState({ methods: result.data, isLoading: false, error: null });
    } catch {
      setState({
        methods: [],
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  /**
   * addStart
   * Phase 1 — opens a new ₱1 authorize-then-void hold. Returns the
   * paymentIntentId + clientKey the caller hands to
   * lib/paymongoClient.ts to attach a card client-side.
   */
  const addStart = useCallback(async (): Promise<
    (MutationResult & { paymentIntentId?: string; clientKey?: string })
  > => {
    try {
      const response = await fetch("/api/buyer/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message };
      return {
        success: true,
        message: "",
        paymentIntentId: result.data.paymentIntentId,
        clientKey: result.data.clientKey,
      };
    } catch {
      return { success: false, message: "We couldn't start adding that card. Please try again." };
    }
  }, []);

  /**
   * addFinalize
   * Phase 2 — called once the card is attached to the hold (either
   * immediately, or after the buyer completes 3D Secure and PayMongo
   * redirects back). Refetches the list on success so the new card
   * (and its auto-assigned default status, if it's the first one)
   * shows up right away.
   */
  const addFinalize = useCallback(
    async (paymentIntentId: string): Promise<MutationResult> => {
      try {
        const response = await fetch("/api/buyer/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ paymentIntentId }),
        });
        const result = await response.json();

        if (!result.success) return { success: false, message: result.message };
        await fetchMethods();
        return { success: true, message: "" };
      } catch {
        return { success: false, message: "We couldn't finish adding that card. Please try again." };
      }
    },
    [fetchMethods]
  );

  const removeMethod = useCallback(
    async (id: string): Promise<MutationResult> => {
      try {
        const response = await fetch(`/api/buyer/payment-methods/${id}`, {
          method: "DELETE",
          headers: getCsrfHeader(),
        });
        const result = await response.json();

        if (!result.success) return { success: false, message: result.message };
        await fetchMethods();
        return { success: true, message: "" };
      } catch {
        return { success: false, message: "We couldn't remove that payment method. Please try again." };
      }
    },
    [fetchMethods]
  );

  const setDefaultMethod = useCallback(
    async (id: string): Promise<MutationResult> => {
      try {
        const response = await fetch(`/api/buyer/payment-methods/${id}/default`, {
          method: "PUT",
          headers: getCsrfHeader(),
        });
        const result = await response.json();

        if (!result.success) return { success: false, message: result.message };
        await fetchMethods();
        return { success: true, message: "" };
      } catch {
        return { success: false, message: "We couldn't update your default payment method. Please try again." };
      }
    },
    [fetchMethods]
  );

  return { ...state, refetch: fetchMethods, addStart, addFinalize, removeMethod, setDefaultMethod };
}
