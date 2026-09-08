/**
 * FILE: lib/hooks/useAccountActivity.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/account-activity
 * (task-46). Owns the loading/empty/error states (Rule 25),
 * pagination, and the accountId/action/date-range filters against
 * GET /api/superadmin/account-activity. Mirrors
 * useSecurityLogs.ts's shape so every super-admin list page fetches
 * the same way (Rule 31.2 — never fetch directly inside a
 * component).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AccountActivityListItem {
  id: string;
  accountId: string;
  action: string;
  ipAddress: string | null;
  geoCity: string | null;
  geoCountry: string | null;
  deviceType: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface FetchState {
  logs: AccountActivityListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  accounts: string[];
  isLoading: boolean;
  error: string | null;
}

export function useAccountActivity() {
  const [accountId, setAccountId] = useState<string>("all");
  const [action, setAction] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    logs: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    accounts: [],
    isLoading: true,
    error: null,
  });

  const fetchActivity = useCallback(
    async (page: number, accountFilter: string, actionFilter: string, from: string, to: string) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (accountFilter !== "all") params.set("accountId", accountFilter);
        if (actionFilter.trim()) params.set("action", actionFilter.trim());
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);

        const response = await fetch(`/api/superadmin/account-activity?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          setState((current) => ({ ...current, isLoading: false, error: result.message }));
          return;
        }
        setState({
          logs: result.data.logs,
          totalPages: result.data.totalPages,
          totalCount: result.data.totalCount,
          page: result.data.page,
          accounts: result.data.accounts,
          isLoading: false,
          error: null,
        });
      } catch {
        setState((current) => ({
          ...current,
          isLoading: false,
          error: "We couldn't reach the server. Check your connection and try again.",
        }));
      }
    },
    []
  );

  useEffect(() => {
    fetchActivity(1, accountId, action, dateFrom, dateTo);
  }, [fetchActivity, accountId, action, dateFrom, dateTo]);

  const goToPage = useCallback(
    (page: number) => fetchActivity(page, accountId, action, dateFrom, dateTo),
    [fetchActivity, accountId, action, dateFrom, dateTo]
  );
  const refetch = useCallback(
    () => fetchActivity(state.page, accountId, action, dateFrom, dateTo),
    [fetchActivity, state.page, accountId, action, dateFrom, dateTo]
  );

  return {
    ...state,
    accountId,
    action,
    dateFrom,
    dateTo,
    setAccountId,
    setAction,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  };
}
