/**
 * FILE: lib/hooks/useMediaLibrary.ts
 * PURPOSE:
 * Client-side data fetching for /superAdmin/media (task-120). Owns the
 * loading/empty/error states (Rule 25), the folder filter, the
 * "Load more" cursor pagination, and the filename search against
 * GET /api/superadmin/media (task-119). Same shape as useBackups.ts so
 * every super-admin list page fetches the same way (Rule 31.2 — never
 * fetch directly inside a component).
 *
 * Pagination note: R2 pages by cursor, not page number, so this hook
 * appends each new page to the list instead of replacing it.
 *
 * Search note: the API has no search parameter, so the search box only
 * filters the files already loaded on screen. Load more to search
 * further down the bucket.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface MediaLibraryItem {
  key: string;
  url: string;
  sizeBytes: number;
  lastModified: string | null;
}

interface FetchState {
  objects: MediaLibraryItem[];
  nextCursor: string | null;
  folders: string[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}

const PAGE_LIMIT = 48;

// Strips the characters forbidden across all user-facing text inputs
// (Rule 18.1) — same first line of defense used by useCreateAdminForm.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

export function useMediaLibrary() {
  const [folder, setFolder] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [state, setState] = useState<FetchState>({
    objects: [],
    nextCursor: null,
    folders: [],
    isLoading: true,
    isLoadingMore: false,
    error: null,
    loadMoreError: null,
  });

  // Counts requests so a slow response for an old folder can never
  // overwrite the list for the folder the admin switched to since.
  const latestRequestId = useRef(0);

  const fetchPage = useCallback(
    async (folderName: string, cursor: string | null, mode: "replace" | "append") => {
      latestRequestId.current += 1;
      const requestId = latestRequestId.current;

      setState((current) =>
        mode === "replace"
          ? { ...current, isLoading: true, error: null }
          : { ...current, isLoadingMore: true, loadMoreError: null }
      );

      try {
        const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
        if (folderName) params.set("folder", folderName);
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/superadmin/media?${params.toString()}`);
        const result = await response.json();

        // A newer request has started since this one — drop this result
        if (requestId !== latestRequestId.current) return;

        if (!result.success) {
          setState((current) =>
            mode === "replace"
              ? { ...current, isLoading: false, error: result.message }
              : { ...current, isLoadingMore: false, loadMoreError: result.message }
          );
          return;
        }

        setState((current) => ({
          objects: mode === "replace" ? result.data.objects : [...current.objects, ...result.data.objects],
          nextCursor: result.data.nextCursor,
          folders: result.data.folders,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          loadMoreError: null,
        }));
      } catch {
        if (requestId !== latestRequestId.current) return;
        const message = "We couldn't reach the server. Check your connection and try again.";
        setState((current) =>
          mode === "replace"
            ? { ...current, isLoading: false, error: message }
            : { ...current, isLoadingMore: false, loadMoreError: message }
        );
      }
    },
    []
  );

  // Runs on first load and every time the admin picks a different
  // folder — always restarts from the first page of that folder.
  useEffect(() => {
    fetchPage(folder, null, "replace");
  }, [fetchPage, folder]);

  const loadMore = useCallback(() => {
    if (state.nextCursor) fetchPage(folder, state.nextCursor, "append");
  }, [fetchPage, folder, state.nextCursor]);

  const refetch = useCallback(() => fetchPage(folder, null, "replace"), [fetchPage, folder]);

  const updateSearchText = useCallback((value: string) => {
    setSearchText(value.replace(FORBIDDEN_CHARACTERS, ""));
  }, []);

  // Only the files already loaded are searched — see the note above.
  const visibleObjects = useMemo(() => {
    const searchTerm = searchText.trim().toLowerCase();
    if (!searchTerm) return state.objects;
    return state.objects.filter((item) => item.key.toLowerCase().includes(searchTerm));
  }, [state.objects, searchText]);

  return {
    ...state,
    visibleObjects,
    folder,
    setFolder,
    searchText,
    updateSearchText,
    loadMore,
    refetch,
  };
}
