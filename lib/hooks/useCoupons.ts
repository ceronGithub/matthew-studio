/**
 * FILE: lib/hooks/useCoupons.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/coupons (task-54g,
 * additional_platform_gaps_specification.md Section 4.1, admin side).
 * Owns the loading/empty/error states (Rule 25), pagination, the
 * on/off filter, the code search, and the switch-on/off mutation —
 * never calls fetch directly inside a component (Rule 31.2). Same
 * shape as lib/hooks/useAnnouncements.ts. Creating a coupon is handled
 * separately by lib/hooks/useCouponForm.ts because that hook also owns
 * the form's validation state.
 *
 * DATA FLOW:
 * 1. Filters or page change -> GET /api/superadmin/coupons (task-54f).
 * 2. setCouponActive -> PATCH /api/superadmin/coupons/[couponId] with
 *    { isActive }, then refetches the current page so the row updates.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface CouponListItem {
  id: string;
  code: string;
  discountType: string; // percentage | fixed | free_shipping
  discountValue: number;
  usageLimit: number | null; // null = unlimited
  usageCount: number;
  expiresAt: string | null; // null = never expires
  scopeCategory: string | null; // null = all categories
  isActive: boolean;
  createdAt: string;
}

export interface CouponFilters {
  status: string; // "" = all, "active" = switched on, "inactive" = switched off
  search: string;
}

interface FetchState {
  coupons: CouponListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export type CouponMutationResult = { success: boolean; message?: string };

const DEFAULT_FILTERS: CouponFilters = { status: "", search: "" };
const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

function buildQuery(page: number, filters: CouponFilters): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.status) params.set("status", filters.status);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export function useCoupons() {
  const [filters, setFilters] = useState<CouponFilters>(DEFAULT_FILTERS);
  const [state, setState] = useState<FetchState>({
    coupons: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchCoupons = useCallback(async (page: number, currentFilters: CouponFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/superadmin/coupons?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        coupons: result.data.coupons,
        totalPages: result.data.totalPages,
        totalCount: result.data.totalCount,
        page: result.data.page,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((current) => ({ ...current, isLoading: false, error: NETWORK_ERROR_MESSAGE }));
    }
  }, []);

  // Runs on first load and whenever a filter changes — always back to page 1.
  useEffect(() => {
    fetchCoupons(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback(
    (page: number) => fetchCoupons(page, filters),
    [fetchCoupons, filters]
  );
  const refetch = useCallback(
    () => fetchCoupons(state.page, filters),
    [fetchCoupons, state.page, filters]
  );

  const updateFilters = useCallback((partial: Partial<CouponFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);
  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /**
   * setCouponActive
   * Switches one coupon on or off. Coupons are never deleted, so this is
   * the only way to stop a code being used. The caller shows the
   * confirmation modal for "off" before calling this (Rule 34.4).
   */
  const setCouponActive = useCallback(
    async (couponId: string, isActive: boolean): Promise<CouponMutationResult> => {
      try {
        const response = await fetch(`/api/superadmin/coupons/${couponId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ isActive }),
        });
        const result = await response.json();
        if (result.success) await fetchCoupons(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: NETWORK_ERROR_MESSAGE };
      }
    },
    [fetchCoupons, state.page, filters]
  );

  return { ...state, filters, updateFilters, clearFilters, goToPage, refetch, setCouponActive };
}
