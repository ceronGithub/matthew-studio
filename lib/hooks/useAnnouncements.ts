/**
 * FILE: lib/hooks/useAnnouncements.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/announcements (task-118a,
 * super_admin_account_specification.md Section 3.9). Owns the
 * loading/empty/error states (Rule 25), pagination, and the status
 * filter — never calls fetch directly inside the page/component
 * (Rule 31.2). Mirrors lib/hooks/useSuperAdminProducts.ts's shape.
 *
 * Create/edit mutations are handled separately by
 * lib/hooks/useAnnouncementForm.ts (task-118b) since that hook also
 * owns form validation state, which doesn't belong here. Duplicate,
 * deactivate, and soft-delete are pure list-row actions with no form
 * state, so they DO extend this file (task-118c) — same split
 * lib/hooks/useAdminManagement.ts uses (setActive/deleteAdmin live in
 * the list hook; the create/edit form is separate).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

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

  type MutationResult = { success: boolean; message?: string };

  /**
   * duplicateAnnouncement
   * task-118c "Duplicate" row action. Server clones the row as a new
   * draft (title suffixed " (Copy)") — no confirmation modal per the
   * task spec (only Delete requires one). Refetches the current
   * page/filters on success so the new row appears without a full
   * page reload.
   */
  const duplicateAnnouncement = useCallback(
    async (announcementId: string): Promise<MutationResult> => {
      try {
        const response = await fetch(`/api/superadmin/announcements/${announcementId}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        });
        const result = await response.json();
        if (result.success) await fetchAnnouncements(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [fetchAnnouncements, state.page, filters]
  );

  /**
   * deactivateAnnouncement
   * task-118c "Deactivate early" row action. Sets status to
   * "expired" ahead of its scheduled expiresAt. No confirmation
   * modal per the task spec — direct action + toast.
   */
  const deactivateAnnouncement = useCallback(
    async (announcementId: string): Promise<MutationResult> => {
      try {
        const response = await fetch(`/api/superadmin/announcements/${announcementId}/deactivate`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        });
        const result = await response.json();
        if (result.success) await fetchAnnouncements(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [fetchAnnouncements, state.page, filters]
  );

  /**
   * deleteAnnouncement
   * task-118c "Delete" row action. Soft-deletes the row (Rule 6).
   * The caller wraps this behind ConfirmationModal's 5-second delay
   * (Rule 34.4) — this function itself has no delay of its own.
   */
  const deleteAnnouncement = useCallback(
    async (announcementId: string): Promise<MutationResult> => {
      try {
        const response = await fetch(`/api/superadmin/announcements/${announcementId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        });
        const result = await response.json();
        if (result.success) await fetchAnnouncements(state.page, filters);
        return { success: Boolean(result.success), message: result.message };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      }
    },
    [fetchAnnouncements, state.page, filters]
  );

  return {
    ...state,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
    duplicateAnnouncement,
    deactivateAnnouncement,
    deleteAnnouncement,
  };
}
