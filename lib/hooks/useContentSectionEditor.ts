/**
 * FILE: lib/hooks/useContentSectionEditor.ts
 * PURPOSE:
 * Client-side data fetching + mutations for the right-hand form panel
 * of /superAdmin/content (task-115), scoped to a single selected
 * section. Owns:
 *   - detail fetch: GET /api/superadmin/content/[sectionId]
 *   - version history fetch: GET .../[sectionId]/versions
 *   - publish: PUT .../[sectionId]
 *   - revert: POST .../[sectionId]/revert
 * Re-fetches both the detail and the version list after a successful
 * publish or revert, since both change what the "current" data and
 * the available revert targets are. Never fetched directly inside a
 * component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface ContentSectionDetail {
  id: string;
  sectionKey: string;
  label: string;
  data: Record<string, unknown>;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ContentVersionListItem {
  id: string;
  createdAt: string;
  savedBy: string | null;
}

interface EditorState {
  section: ContentSectionDetail | null;
  versions: ContentVersionListItem[];
  isLoading: boolean;
  error: string | null;
}

export function useContentSectionEditor(sectionId: string | null) {
  const [state, setState] = useState<EditorState>({
    section: null,
    versions: [],
    isLoading: false,
    error: null,
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const loadSection = useCallback(async (id: string) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const [detailResponse, versionsResponse] = await Promise.all([
        fetch(`/api/superadmin/content/${id}`),
        fetch(`/api/superadmin/content/${id}/versions`),
      ]);
      const detailResult = await detailResponse.json();
      const versionsResult = await versionsResponse.json();

      if (!detailResult.success) {
        setState({ section: null, versions: [], isLoading: false, error: detailResult.message });
        return;
      }
      setState({
        section: detailResult.data,
        versions: versionsResult.success ? versionsResult.data.versions : [],
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        section: null,
        versions: [],
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setState({ section: null, versions: [], isLoading: false, error: null });
      return;
    }
    loadSection(sectionId);
  }, [sectionId, loadSection]);

  /**
   * publish
   * Sends the edited data object as the section's new published
   * state. Returns { success, message } so the caller (ContentEditor)
   * decides what toast to show — this hook never fires toasts itself,
   * same separation as every other mutation hook in this codebase.
   */
  const publish = useCallback(
    async (data: Record<string, unknown>): Promise<{ success: boolean; message: string }> => {
      if (!sectionId) return { success: false, message: "No section selected." };
      setIsPublishing(true);
      try {
        const response = await fetch(`/api/superadmin/content/${sectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ data }),
        });
        const result = await response.json();
        if (result.success) await loadSection(sectionId);
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't save your changes. Please try again in a moment." };
      } finally {
        setIsPublishing(false);
      }
    },
    [sectionId, loadSection]
  );

  /**
   * revert
   * Restores a prior ContentVersion by id. Same success/message
   * return contract as publish() above.
   */
  const revert = useCallback(
    async (versionId: string): Promise<{ success: boolean; message: string }> => {
      if (!sectionId) return { success: false, message: "No section selected." };
      setIsReverting(true);
      try {
        const response = await fetch(`/api/superadmin/content/${sectionId}/revert`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ versionId }),
        });
        const result = await response.json();
        if (result.success) await loadSection(sectionId);
        return { success: result.success, message: result.message };
      } catch {
        return { success: false, message: "We couldn't revert this section. Please try again in a moment." };
      } finally {
        setIsReverting(false);
      }
    },
    [sectionId, loadSection]
  );

  return { ...state, isPublishing, isReverting, publish, revert };
}
