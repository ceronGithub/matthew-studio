/**
 * FILE: lib/hooks/useBackups.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/backups (task-105). Owns
 * the loading/empty/error states (Rule 25), pagination, and the
 * status filter against GET /api/superadmin/backups. Mirrors
 * useAccountActivity.ts's and useSecurityLogs.ts's shape so every
 * super-admin list page fetches the same way (Rule 31.2 — never
 * fetch directly inside a component).
 *
 * Strictly a READ — this hook has no mutation methods, matching
 * Rule 40.6's "no Run Backup Now button" requirement.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface BackupLogListItem {
  id: string;
  status: string; // "running" | "success" | "failed"
  fileSizeBytes: number | null;
  r2Key: string | null;
  r2Url: string | null;
  driveFileId: string | null;
  driveViewLink: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface FetchState {
  logs: BackupLogListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

export function useBackups() {
  const [status, setStatus] = useState<string>("all");
  const [state, setState] = useState<FetchState>({
    logs: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchBackups = useCallback(async (page: number, statusFilter: string) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/superadmin/backups?${params.toString()}`);
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
  }, []);

  useEffect(() => {
    fetchBackups(1, status);
  }, [fetchBackups, status]);

  const goToPage = useCallback((page: number) => fetchBackups(page, status), [fetchBackups, status]);
  const refetch = useCallback(() => fetchBackups(state.page, status), [fetchBackups, state.page, status]);

  return {
    ...state,
    status,
    setStatus,
    goToPage,
    refetch,
  };
}
