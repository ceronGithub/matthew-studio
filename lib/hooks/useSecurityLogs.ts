/**
 * FILE: lib/hooks/useSecurityLogs.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/security-logs (task-45,
 * UI half). Owns the loading/empty/error states (Rule 25), pagination,
 * and the eventType/deviceType/geoCountry/date-range filters against
 * GET /api/superadmin/security-logs (task-45, API half — unscoped,
 * platform-wide). Mirrors useGatekeeperBans.ts's shape so every
 * super-admin list page fetches the same way (Rule 31.2 — never
 * fetch directly inside a component).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface SecurityLogListItem {
  id: string;
  eventType: string;
  actor: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  deviceType: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  geoLatitude: number | null;
  geoLongitude: number | null;
  geoAccuracy: number | null;
  createdAt: string;
}

interface FetchState {
  logs: SecurityLogListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useSecurityLogs() {
  const [eventType, setEventType] = useState<string>("all");
  const [deviceType, setDeviceType] = useState<string>("all");
  const [geoCountry, setGeoCountry] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    logs: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchLogs = useCallback(
    async (
      page: number,
      eventTypeFilter: string,
      deviceTypeFilter: string,
      countryFilter: string,
      from: string,
      to: string
    ) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (eventTypeFilter !== "all") params.set("eventType", eventTypeFilter);
        if (deviceTypeFilter !== "all") params.set("deviceType", deviceTypeFilter);
        if (countryFilter.trim()) params.set("geoCountry", countryFilter.trim());
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);

        const response = await fetch(`/api/superadmin/security-logs?${params.toString()}`);
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
    fetchLogs(1, eventType, deviceType, geoCountry, dateFrom, dateTo);
  }, [fetchLogs, eventType, deviceType, geoCountry, dateFrom, dateTo]);

  const goToPage = useCallback(
    (page: number) => fetchLogs(page, eventType, deviceType, geoCountry, dateFrom, dateTo),
    [fetchLogs, eventType, deviceType, geoCountry, dateFrom, dateTo]
  );
  const refetch = useCallback(
    () => fetchLogs(state.page, eventType, deviceType, geoCountry, dateFrom, dateTo),
    [fetchLogs, state.page, eventType, deviceType, geoCountry, dateFrom, dateTo]
  );

  return {
    ...state,
    eventType,
    deviceType,
    geoCountry,
    dateFrom,
    dateTo,
    setEventType,
    setDeviceType,
    setGeoCountry,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
  };
}
