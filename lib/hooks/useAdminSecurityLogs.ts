/**
 * FILE: lib/hooks/useAdminSecurityLogs.ts
 * PURPOSE:
 * Client-side data fetching for /admin/security-logs (task-42, UI
 * half, admin_account_specification.md Section 3.6). Owns the
 * loading/empty/error/forbidden states (Rule 25) and the eventType +
 * date-range filters against GET /api/admin/security-logs, which is
 * always scoped server-side to `WHERE actor = currentAdmin.email`
 * (Section 3.6's own wording — never trust a frontend filter alone
 * for that restriction). Mirrors lib/hooks/useAdminAnalytics.ts's
 * isForbidden pattern so a missing "view-security-logs" permission
 * renders the same way analytics does on a missing permission.
 *
 * Deliberately narrower than lib/hooks/useSecurityLogs.ts (the
 * super-admin version): no deviceType/geoCountry filters and no CSV
 * export, since Section 3.6 only calls for Event Type + Date Range
 * filters on the admin-scoped view. The row shape returned by the
 * API is identical to the super-admin route, so this hook re-exports
 * SecurityLogListItem from useSecurityLogs.ts rather than redefining
 * it.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { SecurityLogListItem } from "@/lib/hooks/useSecurityLogs";

export type { SecurityLogListItem };

interface FetchState {
  logs: SecurityLogListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean; // true on 403 — missing "view-security-logs" permission (Section 3.6's "Availability" gate)
}

export function useAdminSecurityLogs() {
  const [eventType, setEventType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    logs: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
    isForbidden: false,
  });

  const fetchLogs = useCallback(async (page: number, eventTypeFilter: string, from: string, to: string) => {
    setState((current) => ({ ...current, isLoading: true, error: null, isForbidden: false }));
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (eventTypeFilter !== "all") params.set("eventType", eventTypeFilter);
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);

      const response = await fetch(`/api/admin/security-logs?${params.toString()}`);
      const result = await response.json();

      if (response.status === 403) {
        setState((current) => ({ ...current, isLoading: false, error: result.message, isForbidden: true }));
        return;
      }

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message, isForbidden: false }));
        return;
      }

      setState({
        logs: result.data.logs,
        totalPages: result.data.totalPages,
        totalCount: result.data.totalCount,
        page: result.data.page,
        isLoading: false,
        error: null,
        isForbidden: false,
      });
    } catch {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
        isForbidden: false,
      }));
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, eventType, dateFrom, dateTo);
  }, [fetchLogs, eventType, dateFrom, dateTo]);

  const goToPage = useCallback((page: number) => fetchLogs(page, eventType, dateFrom, dateTo), [fetchLogs, eventType, dateFrom, dateTo]);
  const refetch = useCallback(() => fetchLogs(state.page, eventType, dateFrom, dateTo), [fetchLogs, state.page, eventType, dateFrom, dateTo]);

  return {
    ...state,
    eventType,
    dateFrom,
    dateTo,
    setEventType,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  };
}
