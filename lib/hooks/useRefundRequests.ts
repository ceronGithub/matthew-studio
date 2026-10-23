/**
 * FILE: lib/hooks/useRefundRequests.ts
 * PURPOSE:
 * Client-side data for /admin/refund-requests (task-55e,
 * additional_platform_gaps_specification.md Section 4.2, admin side).
 * Loads one page of refund requests from GET /api/admin/refund-requests,
 * owns the loading / empty / error states (Rule 25), the status filter
 * and pagination, and sends the approve / deny decision to
 * PATCH /api/admin/refund-requests/[requestId] (task-55d).
 *
 * Never calls fetch inside the page or component (Rule 31.2). Mirrors
 * useAdminOrders.ts's shape.
 *
 * DATA FLOW:
 * 1. On mount, and whenever the status filter changes, page 1 is fetched.
 * 2. decideRequest() sends the decision with the CSRF header, then the
 *    list is fetched again so the decided request leaves (or updates in)
 *    the queue.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export type RefundStatusFilter = "pending" | "approved" | "denied" | "all";
export type RefundDecision = "approve" | "deny";

export interface AdminRefundRequestItem {
  id: string;
  orderId: string;
  orderShortId: string;
  orderStatus: string;
  orderTotal: number;
  hasPaymentOnFile: boolean;
  buyerEmail: string | null;
  reason: string;
  note: string | null;
  refundAmount: number;
  status: string;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface RefundDecisionResult {
  success: boolean;
  message: string;
  httpStatus: number;
}

interface FetchState {
  requests: AdminRefundRequestItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

export function useRefundRequests() {
  const [statusFilter, setStatusFilterState] = useState<RefundStatusFilter>("pending");
  const [state, setState] = useState<FetchState>({
    requests: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  /**
   * fetchRequests
   * Loads one page for one status filter. If a decision just emptied the
   * last page of a multi-page list, it steps back one page at a time
   * instead of showing an empty page that has data behind it.
   */
  const fetchRequests = useCallback(async (startPage: number, status: RefundStatusFilter) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      for (let pageToLoad = startPage; pageToLoad >= 1; pageToLoad -= 1) {
        const response = await fetch(`/api/admin/refund-requests?status=${status}&page=${pageToLoad}`);
        const result = await response.json();

        if (!result.success) {
          setState((current) => ({ ...current, isLoading: false, error: result.message }));
          return;
        }

        // An empty page above page 1 means the list shrank — try the page before it.
        if (result.data.requests.length === 0 && pageToLoad > 1) continue;

        setState({
          requests: result.data.requests,
          totalPages: result.data.totalPages,
          totalCount: result.data.totalCount,
          page: result.data.page,
          isLoading: false,
          error: null,
        });
        return;
      }
    } catch {
      setState((current) => ({ ...current, isLoading: false, error: NETWORK_ERROR_MESSAGE }));
    }
  }, []);

  // A new filter always starts again from page 1.
  useEffect(() => {
    fetchRequests(1, statusFilter);
  }, [fetchRequests, statusFilter]);

  const setStatusFilter = useCallback((nextFilter: RefundStatusFilter) => {
    setStatusFilterState(nextFilter);
  }, []);

  const goToPage = useCallback((page: number) => fetchRequests(page, statusFilter), [fetchRequests, statusFilter]);
  const refetch = useCallback(() => fetchRequests(state.page, statusFilter), [fetchRequests, state.page, statusFilter]);

  /**
   * decideRequest
   * Sends approve or deny for one pending request. The list is fetched
   * again after a success, and after a 409 (someone else already decided
   * it) so the admin sees the real current state. Any other failure
   * leaves the list untouched — the request is still pending.
   *
   * Returns the server's own message (Rule 28) so the caller can show it
   * in a toast without rewriting it.
   */
  const decideRequest = useCallback(
    async (requestId: string, decision: RefundDecision, note: string): Promise<RefundDecisionResult> => {
      try {
        const response = await fetch(`/api/admin/refund-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ decision, note }),
        });
        const result = await response.json();

        if (result.success || response.status === 409) {
          await fetchRequests(state.page, statusFilter);
        }
        return { success: Boolean(result.success), message: result.message, httpStatus: response.status };
      } catch {
        return { success: false, message: NETWORK_ERROR_MESSAGE, httpStatus: 0 };
      }
    },
    [fetchRequests, state.page, statusFilter]
  );

  return {
    ...state,
    statusFilter,
    setStatusFilter,
    goToPage,
    refetch,
    decideRequest,
  };
}
