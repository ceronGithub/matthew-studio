/**
 * FILE: lib/hooks/useAnnouncements.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/announcements (task-118a,
 * super_admin_account_specification.md Section 3.9). Owns the
 * loading/empty/error states (Rule 25), pagination, and the status
 * filter — never calls fetch directly inside the page/component
 * (Rule 31.2). Mirrors lib/hooks/useSuperAdminProducts.ts's shape.
 *
 * Create/edit/duplicate/deactivate/delete mutations are NOT part of
 * this hook yet — those land with task-118b (form) and task-118c
 * (row actions), which will extend this file rather than duplicate
 * the fetch logic.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AnnouncementListItem {
  id: string;
  title: string;
  message: string;
  placement: string;
  status: string;
  publishAt: string;
  expiresAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface AnnouncementFilters {
  status: string; // "" means all statuses
  search: string;
}

interface FetchState {
  announcements: AnnouncementListItem[];
  totalPages: number;
  totalCount: number;
  page: number;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_FILTERS: AnnouncementFilters = { status: "", search: "" };

function buildQuery(page: number, filters: AnnouncementFilters): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.status) params.set("status", filters.status);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export function useAnnouncements() {
  const [filters, setFilters] = useState<AnnouncementFilters>(DEFAULT_FILTERS);
  const [state, setState] = useState<FetchState>({
    announcements: [],
    totalPages: 1,
    totalCount: 0,
    page: 1,
    isLoading: true,
    error: null,
  });

  const fetchAnnouncements = useCallback(async (page: number, currentFilters: AnnouncementFilters) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/superadmin/announcements?${buildQuery(page, currentFilters)}`);
      const result = await response.json();

      if (!result.success) {
        setState((current) => ({ ...current, isLoading: false, error: result.message }));
        return;
      }
      setState({
        announcements: result.data.announcements,
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
    fetchAnnouncements(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const goToPage = useCallback(
    (page: number) => fetchAnnouncements(page, filters),
    [fetchAnnouncements, filters]
  );
  const refetch = useCallback(
    () => fetchAnnouncements(state.page, filters),
    [fetchAnnouncements, state.page, filters]
  );

  const updateFilters = useCallback((partial: Partial<AnnouncementFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    ...state,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
  };
}
