/**
 * FILE: lib/hooks/useContentSections.ts
 * PURPOSE:
 * Client-side data fetching for the /superAdmin/content section tree
 * (task-115). Owns the loading/empty/error states (Rule 25) for
 * GET /api/superadmin/content — never fetched directly inside a
 * component (Rule 31.2). Mirrors lib/hooks/useBackups.ts's shape.
 * No pagination — the section list is small by design (one row per
 * editable area, not per visitor).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface ContentSectionListItem {
  id: string;
  sectionKey: string;
  label: string;
  updatedAt: string;
}

interface FetchState {
  sections: ContentSectionListItem[];
  isLoading: boolean;
  error: string | null;
}

export function useContentSections() {
  const [state, setState] = useState<FetchState>({ sections: [], isLoading: true, error: null });

  const fetchSections = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/superadmin/content");
      const result = await response.json();

      if (!result.success) {
        setState({ sections: [], isLoading: false, error: result.message });
        return;
      }
      setState({ sections: result.data.sections, isLoading: false, error: null });
    } catch {
      setState({
        sections: [],
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { ...state, refetch: fetchSections };
}
