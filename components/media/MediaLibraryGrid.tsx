/**
 * FILE: components/media/MediaLibraryGrid.tsx
 * ROLE: Super-admin only — rendered inside
 * app/superAdmin/media/page.tsx.
 *
 * PURPOSE:
 * task-120, super_admin_account_specification.md Section 9.3: a grid
 * of everything uploaded to Cloudflare R2, with a folder filter, a
 * filename search, and a "Copy URL" action per file so an image can be
 * reused instead of re-uploaded. Handles all three required data
 * states (Rule 25): loading skeleton, empty state, error with retry.
 * Read-only — there is no upload or delete here.
 */
"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { useMediaLibrary, type MediaLibraryItem } from "@/lib/hooks/useMediaLibrary";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import MediaLibraryCard from "@/components/media/MediaLibraryCard";
import MediaLibraryToolbar from "@/components/media/MediaLibraryToolbar";

const COPIED_FLASH_MILLISECONDS = 1500;

export default function MediaLibraryGrid() {
  const {
    visibleObjects,
    objects,
    folders,
    folder,
    setFolder,
    searchText,
    updateSearchText,
    nextCursor,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    loadMore,
    refetch,
  } = useMediaLibrary();

  const { toasts, showToast, dismissToast } = useToast();

  // Key of the file whose URL was just copied — drives the brief
  // "Copied" label on that one card's button.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /**
   * handleCopyUrl
   * Copies the file's public URL and flashes "Copied" on its button —
   * no page-wide toast for this frequent, low-stakes action (same as
   * the Vault page). Only a failure gets a toast, since the admin
   * would otherwise think the copy worked.
   */
  async function handleCopyUrl(item: MediaLibraryItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedKey(item.key);
      setTimeout(() => setCopiedKey((current) => (current === item.key ? null : current)), COPIED_FLASH_MILLISECONDS);
    } catch {
      showToast("✕ Couldn't copy to the clipboard. Select the URL and copy it manually.", "error");
    }
  }

  const emptyMessage = searchText
    ? "No loaded files match this search."
    : folder
      ? `No files in the "${folder}" folder yet.`
      : "No files in the media library yet.";

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <MediaLibraryToolbar
        folder={folder}
        folders={folders}
        searchText={searchText}
        onFolderChange={setFolder}
        onSearchTextChange={updateSearchText}
        onClearFilters={() => {
          setFolder("");
          updateSearchText("");
        }}
      />

      {isLoading ? (
        <ul className="superAdminMediaGrid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <li key={index} className="superAdminMediaCard">
              <div className="superAdminMediaPreview skeletonBlock" />
              <div className="superAdminMediaSkeletonLine skeletonBlock" />
              <div className="superAdminMediaSkeletonLine superAdminMediaSkeletonLine--short skeletonBlock" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="superAdminMediaEmptyState">
          <Images size={32} />
          <p>{error}</p>
          <button type="button" className="superAdminMediaRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : visibleObjects.length === 0 ? (
        <div className="superAdminMediaEmptyState">
          <Images size={32} />
          <p>{emptyMessage}</p>
          {searchText && nextCursor && <p>Load more files to search further down the library.</p>}
        </div>
      ) : (
        <ul className="superAdminMediaGrid">
          {visibleObjects.map((item) => (
            <MediaLibraryCard
              key={item.key}
              item={item}
              isCopied={copiedKey === item.key}
              onCopyUrl={handleCopyUrl}
            />
          ))}
        </ul>
      )}

      {!isLoading && !error && objects.length > 0 && (
        <div className="superAdminMediaFooter">
          <span className="superAdminMediaTotalCount">
            {searchText
              ? `${visibleObjects.length} of ${objects.length} loaded file${objects.length === 1 ? "" : "s"}`
              : `${objects.length} file${objects.length === 1 ? "" : "s"} loaded`}
          </span>

          {loadMoreError && <span className="superAdminMediaLoadMoreError">{loadMoreError}</span>}

          {nextCursor && (
            <button
              type="button"
              className="superAdminMediaLoadMoreButton"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : loadMoreError ? "Try again" : "Load more"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
