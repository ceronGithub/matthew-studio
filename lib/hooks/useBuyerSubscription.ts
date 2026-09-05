/**
 * FILE: lib/hooks/useBuyerSubscription.ts
 * PURPOSE:
 * Client-side data fetching and mutation for /buyer/subscription
 * (buyer_account_specification.md Section 4.4). Owns the
 * loading/empty/error states (Rule 25) for the subscription +
 * billing-history fetch; the cancel mutation reports its own
 * success/message so the caller can show the right toast, same
 * shape as useBuyerPaymentMethods.ts.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface Subscription {
  id: string;
  planName: string;
  priceAmount: number;
  billingCycle: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionInvoice {
  id: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
  issuedAt: string;
}

interface FetchState {
  subscription: Subscription | null;
  invoices: SubscriptionInvoice[];
  isLoading: boolean;
  error: string | null;
}

interface MutationResult {
  success: boolean;
  message: string;
}

export function useBuyerSubscription() {
  const [state, setState] = useState<FetchState>({
    subscription: null,
    invoices: [],
    isLoading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      // Both calls run in parallel — the invoices list is independent
      // of whether the subscription fetch itself succeeds or is null.
      const [subscriptionResponse, invoicesResponse] = await Promise.all([
        fetch("/api/buyer/subscription"),
        fetch("/api/buyer/subscription/invoices"),
      ]);
      const subscriptionResult = await subscriptionResponse.json();
      const invoicesResult = await invoicesResponse.json();

      if (!subscriptionResult.success) {
        setState({ subscription: null, invoices: [], isLoading: false, error: subscriptionResult.message });
        return;
      }

      setState({
        subscription: subscriptionResult.data,
        invoices: invoicesResult.success ? invoicesResult.data : [],
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        subscription: null,
        invoices: [],
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const cancelSubscription = useCallback(async (): Promise<MutationResult> => {
    try {
      const response = await fetch("/api/buyer/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message };
      await fetchAll();
      return { success: true, message: result.message };
    } catch {
      return { success: false, message: "We couldn't cancel your subscription. Please try again." };
    }
  }, [fetchAll]);

  return { ...state, refetch: fetchAll, cancelSubscription };
}
