/**
 * FILE: lib/hooks/useAdminAnalytics.ts
 * PURPOSE:
 * Client-side data fetching for /admin/analytics (task-93,
 * admin_account_specification.md Section 3.5). Owns the loading/
 * empty/error states (Rule 25) and the sticky filters (date-range
 * preset or custom, category multi-select) described in Section
 * 3.5.4, re-calling GET /api/admin/analytics (task-92) whenever a
 * filter changes. Mirrors useAdminOrders.ts's shape — never calls
 * fetch directly inside the page/component (Rule 31.2).
 *
 * "Custom" date range is converted to a day count client-side (the
 * API only accepts `days`, per task-92's contract) — this keeps the
 * API simple while still satisfying the spec's "Custom" preset.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AnalyticsTimeSeriesPoint {
  date: string;
  orders: number;
  revenue: number;
  newBuyers: number;
}

export interface CategoryBreakdownRow {
  category: string;
  categoryLabel: string;
  revenue: number;
  orders: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface BuyerMetrics {
  totalBuyers: number;
  newBuyersLast7Days: number;
  newBuyersLast30Days: number;
  repeatBuyerRate: number;
  averageOrderValue: number;
  lifetimeCustomerValue: number;
}

export interface AdminAnalyticsSummary {
  timeSeries: AnalyticsTimeSeriesPoint[];
  categoryBreakdown: CategoryBreakdownRow[];
  topProducts: TopProductRow[];
  buyerMetrics: BuyerMetrics;
}

export type DatePreset = "today" | "7d" | "30d" | "custom";

export interface AdminAnalyticsFilters {
  preset: DatePreset;
  customDays: number; // only meaningful when preset === "custom"
  categories: string[]; // empty array = all categories
}

interface FetchState {
  summary: AdminAnalyticsSummary | null;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean; // true on 403 — missing view-analytics permission (Section 3.5's "Availability" gate)
}

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "templates", label: "Templates" },
  { value: "tshirts", label: "T-Shirts" },
  { value: "ai-videos", label: "AI Videos" },
  { value: "file-tools", label: "File Tools" },
  { value: "tutorials", label: "Tutorials" },
  { value: "game-characters", label: "Game Characters" },
];

const EMPTY_FILTERS: AdminAnalyticsFilters = { preset: "30d", customDays: 30, categories: [] };

/**
 * presetToDays
 * Converts the sticky date-range preset (Section 3.5.4) into the
 * `days` integer the API actually accepts.
 */
function presetToDays(filters: AdminAnalyticsFilters): number {
  switch (filters.preset) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "custom":
      return filters.customDays;
  }
}

function buildQuery(filters: AdminAnalyticsFilters): string {
  const params = new URLSearchParams({ days: String(presetToDays(filters)) });
  if (filters.categories.length > 0) params.set("categories", filters.categories.join(","));
  return params.toString();
}

export function useAdminAnalytics() {
  const [filters, setFilters] = useState<AdminAnalyticsFilters>(EMPTY_FILTERS);
  const [state, setState] = useState<FetchState>({
    summary: null,
    isLoading: true,
    error: null,
    isForbidden: false,
  });

  const fetchSummary = useCallback(async (activeFilters: AdminAnalyticsFilters) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/analytics?${buildQuery(activeFilters)}`);
      const json = await response.json();

      if (response.status === 403) {
        setState({ summary: null, isLoading: false, error: json.message, isForbidden: true });
        return;
      }

      if (!response.ok || !json.success) {
        setState({
          summary: null,
          isLoading: false,
          error: json.message ?? "Failed to load analytics. Please try again.",
          isForbidden: false,
        });
        return;
      }

      setState({ summary: json.data, isLoading: false, error: null, isForbidden: false });
    } catch {
      setState({
        summary: null,
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
        isForbidden: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchSummary(filters);
  }, [filters, fetchSummary]);

  /**
   * updateFilters
   * Merges a partial filter change into the current filters — the
   * effect above re-fetches automatically whenever this fires.
   */
  const updateFilters = useCallback((partial: Partial<AdminAnalyticsFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * toggleCategory
   * Adds/removes a single category from the active multi-select
   * filter (Section 3.5.4's "Category filter (multi-select)").
   */
  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const refetch = useCallback(() => fetchSummary(filters), [fetchSummary, filters]);

  return { ...state, filters, updateFilters, toggleCategory, refetch };
}
