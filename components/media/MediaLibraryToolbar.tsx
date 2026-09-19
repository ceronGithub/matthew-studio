/**
 * FILE: components/media/MediaLibraryToolbar.tsx
 * ROLE: Super-admin only — filter bar at the top of MediaLibraryGrid.
 *
 * PURPOSE:
 * task-120: the folder dropdown, the filename search box, and the
 * "Clear filters" button. Purely presentational — the filter state
 * itself lives in useMediaLibrary, so this only reports changes upward.
 */
"use client";

interface MediaLibraryToolbarProps {
  folder: string;
  folders: string[];
  searchText: string;
  onFolderChange: (folderName: string) => void;
  onSearchTextChange: (value: string) => void;
  onClearFilters: () => void;
}

function formatFolderLabel(folderName: string): string {
  return folderName.charAt(0).toUpperCase() + folderName.slice(1);
}

export default function MediaLibraryToolbar({
  folder,
  folders,
  searchText,
  onFolderChange,
  onSearchTextChange,
  onClearFilters,
}: MediaLibraryToolbarProps) {
  return (
    <div className="superAdminMediaToolbar">
      <div className="superAdminMediaFilters">
        <select
          className="superAdminMediaFilterSelect"
          value={folder}
          onChange={(event) => onFolderChange(event.target.value)}
          aria-label="Filter by folder"
        >
          <option value="">All folders</option>
          {folders.map((folderName) => (
            <option key={folderName} value={folderName}>
              {formatFolderLabel(folderName)}
            </option>
          ))}
        </select>

        <input
          type="search"
          className="superAdminMediaFilterInput"
          placeholder="Search file name…"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          aria-label="Search loaded files by name"
        />

        {(folder || searchText) && (
          <button type="button" className="superAdminMediaClearFiltersButton" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
