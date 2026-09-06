/**
 * FILE: lib/hooks/useGatekeeperBans.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/gatekeeper (task-33, UI
 * half). Owns the loading/empty/error states (Rule 25), pagination,
 * and the triggerEventType/isActive/date-range filters against
 * GET /api/superadmin/gatekeeper/bans. Also exposes banDevice() and
 * unbanDevice() so the manual-ban form and the unban confirmation
 * modal both call the already-live API half (task-33) through one
 * place — never fetch directly inside a component (Rule 31.2).
 * Mirrors useAdminProducts.ts's shape.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface DeviceBanListItem {
  id: string;
  deviceFingerprint: string;
  reason: string;
  triggerEventType: string;
  strikeCount: number | null;
  relatedLogIds: string[];
  bannedAt: string;
  bannedBy: string;
  isActive: boolean;
  unbannedAt: string | null;
  unbannedBy: string | null;
  unbanNote: string | null;
}

interface FetchState {
  bans: DeviceBanListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useGatekeeperBans() {
  const [triggerEventType, setTriggerEventType] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("active");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    bans: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchBans = useCallback(
    async (page: number, eventTypeFilter: string, activeFilter: string, from: string, to: string) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (eventTypeFilter !== "all") params.set("triggerEventType", eventTypeFilter);
        if (activeFilter !== "all") params.set("isActive", activeFilter === "active" ? "true" : "false");
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);

        const response = await fetch(`/api/superadmin/gatekeeper/bans?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          setState((current) => ({ ...current, isLoading: false, error: result.message }));
          return;
        }
        setState({
          bans: result.data.bans,
          totalPages: result.data.totalPages,
          totalCount: result.data.totalCount,
          page: result.data.page,
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
    fetchBans(1, triggerEventType, isActiveFilter, dateFrom, dateTo);
  }, [fetchBans, triggerEventType, isActiveFilter, dateFrom, dateTo]);

  const goToPage = useCallback(
    (page: number) => fetchBans(page, triggerEventType, isActiveFilter, dateFrom, dateTo),
    [fetchBans, triggerEventType, isActiveFilter, dateFrom, dateTo]
  );
  const refetch = useCallback(
    () => fetchBans(state.page, triggerEventType, isActiveFilter, dateFrom, dateTo),
    [fetchBans, state.page, triggerEventType, isActiveFilter, dateFrom, dateTo]
  );

  async function banDevice(input: {
    deviceFingerprint: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/api/superadmin/gatekeeper/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (result.success) {
        await fetchBans(1, triggerEventType, isActiveFilter, dateFrom, dateTo);
      }
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }

  async function unbanDevice(banId: string, unbanNote: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`/api/superadmin/gatekeeper/bans/${banId}/unban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ unbanNote }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchBans(state.page, triggerEventType, isActiveFilter, dateFrom, dateTo);
      }
      return { success: result.success, message: result.message };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
  }

  return {
    ...state,
    triggerEventType,
    isActiveFilter,
    dateFrom,
    dateTo,
    setTriggerEventType,
    setIsActiveFilter,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
    banDevice,
    unbanDevice,
  };
}
