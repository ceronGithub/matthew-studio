/**
 * FILE: lib/hooks/useBuyerDownloads.ts
 * PURPOSE:
 * Client-side data fetching for /buyer/downloads
 * (buyer_account_specification.md Section 4.1). Owns the
 * loading/empty/error states (Rule 25) and exposes
 * requestDownloadUrl(id), which hits the signed-URL route and opens
 * the result in a new tab — never calls axios/fetch directly inside
 * the page component (Rule 31.2).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface BuyerDownloadItem {
  id: string;
  productId: string;
  name: string;
  categoryLabel: string | null;
  coverImageUrl: string | null;
  licenseKey: string | null;
  purchasedAt: string;
}

interface FetchState {
  downloads: BuyerDownloadItem[];
  isLoading: boolean;
  error: string | null;
}

export function useBuyerDownloads() {
  const [state, setState] = useState<FetchState>({ downloads: [], isLoading: true, error: null });

  const fetchDownloads = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/buyer/downloads");
      const result = await response.json();

      if (!result.success) {
        setState({ downloads: [], isLoading: false, error: result.message });
        return;
      }
      setState({ downloads: result.data, isLoading: false, error: null });
    } catch {
      setState({ downloads: [], isLoading: false, error: "We couldn't reach the server. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  /**
   * requestDownloadUrl
   * Fetches a fresh signed URL for one owned item and opens it in a
   * new tab. Returns { success, message } so the caller can show a
   * toast without duplicating error-message logic.
   */
  const requestDownloadUrl = useCallback(async (downloadId: string) => {
    try {
      const response = await fetch(`/api/buyer/downloads/${downloadId}/file`);
      const result = await response.json();

      if (!result.success) {
        return { success: false, message: result.message as string };
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
      return { success: true, message: "" };
    } catch {
      return { success: false, message: "Download failed. Please try again." };
    }
  }, []);

  return { ...state, refetch: fetchDownloads, requestDownloadUrl };
}
