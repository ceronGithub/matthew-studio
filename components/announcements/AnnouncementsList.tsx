/**
 * FILE: components/announcements/AnnouncementsList.tsx
 * ROLE: Super-admin only — rendered inside
 * app/superAdmin/announcements/page.tsx.
 *
 * PURPOSE:
 * task-118a, super_admin_account_specification.md Section 3.9: every
 * announcement, filterable by status, with Title, Status badge,
 * Publish Date, Expiry Date, and Placement columns. Handles all three
 * required data states (Rule 25): loading skeleton, empty state,
 * error state with retry. Mirrors
 * components/products/SuperAdminProductsList.tsx's structure.
 *
 * task-118b wires Create/Edit into this list via the AnnouncementForm
 * modal below. Duplicate/Deactivate/Delete (task-118c) still render
 * as disabled stub buttons — those land in a later task.
 */
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { useAnnouncements, type AnnouncementListItem } from "@/lib/hooks/useAnnouncements";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--color-text-muted)",
  scheduled: "var(--color-info)",
  live: "var(--color-success)",
  expired: "var(--color-error)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  expired: "Expired",
};

const PLACEMENT_LABELS: Record<string, string> = {
  "homepage-banner": "Homepage Banner",
  "shop-banner": "Shop Banner",
  "login-toast": "Login Toast",
};

export default function AnnouncementsList() {
  const {
    announcements,
    totalPages,
    totalCount,
    page,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    goToPage,
    refetch,
  } = useAnnouncements();

  const { toasts, showToast, dismissToast } = useToast();

  // formMode: null = modal closed, "create" = blank form, or the
  // AnnouncementListItem being edited. Single piece of state covers
  // both Create and Edit since AnnouncementForm handles both modes.
  const [formMode, setFormMode] = useState<"create" | AnnouncementListItem | null>(null);

  function handleSaved(message: string) {
    setFormMode(null);
    showToast(message, "success");
    refetch();
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <AnnouncementForm
        isOpen={formMode !== null}
        existing={formMode === "create" || formMode === null ? null : formMode}
        onClose={() => setFormMode(null)}
        onSaved={handleSaved}
      />

      <div className="superAdminAnnouncementsToolbar">
        <div className="superAdminAnnouncementsFilters">
          <select
            className="superAdminAnnouncementsFilterSelect"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="expired">Expired</option>
          </select>

          <input
            type="search"
            className="superAdminAnnouncementsFilterInput superAdminAnnouncementsSearchInput"
            placeholder="Search title…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search announcements"
          />

          {(filters.status || filters.search) && (
            <button
              type="button"
              className="superAdminAnnouncementsClearFiltersButton"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        <button
          type="button"
          className="superAdminAnnouncementsCreateButton"
          onClick={() => setFormMode("create")}
        >
          + Create Announcement
        </button>
      </div>

      {isLoading ? (
        <div className="superAdminAnnouncementsGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="superAdminAnnouncementsRow--skeleton">
              <div className="superAdminAnnouncementsSkeletonLine skeletonBlock" />
              <div className="superAdminAnnouncementsSkeletonLine skeletonBlock superAdminAnnouncementsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="superAdminAnnouncementsEmptyState">
          <Megaphone size={32} />
          <p>{error}</p>
          <button type="button" className="superAdminAnnouncementsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="superAdminAnnouncementsEmptyState">
          <Megaphone size={32} />
          <p>
            {filters.status || filters.search
              ? "No announcements match these filters."
              : "No announcements yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="superAdminAnnouncementsTableWrapper">
            <table className="superAdminAnnouncementsTable">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Placement</th>
                  <th>Publish Date</th>
                  <th>Expiry Date</th>
                  <th className="superAdminAnnouncementsActionsCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td className="superAdminAnnouncementsNameCell">{announcement.title}</td>
                    <td>
                      <span
                        className="superAdminAnnouncementsStatusBadge"
                        style={{ color: STATUS_COLORS[announcement.status] ?? "var(--color-text-secondary)" }}
                      >
                        {STATUS_LABELS[announcement.status] ?? announcement.status}
                      </span>
                    </td>
                    <td>{PLACEMENT_LABELS[announcement.placement] ?? announcement.placement}</td>
                    <td>{formatDate(announcement.publishAt)}</td>
                    <td>{formatDate(announcement.expiresAt)}</td>
                    <td className="superAdminAnnouncementsActionsCell">
                      {/* Duplicate/Deactivate/Delete still stub — wired in task-118c */}
                      <div className="superAdminAnnouncementsRowActions">
                        <button
                          type="button"
                          className="superAdminAnnouncementsActionButton"
                          onClick={() => setFormMode(announcement)}
                        >
                          Edit
                        </button>
                        <button type="button" className="superAdminAnnouncementsActionButton" disabled>
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="superAdminAnnouncementsActionButton superAdminAnnouncementsActionButton--danger"
                          disabled
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="superAdminAnnouncementsFooter">
            <span className="superAdminAnnouncementsTotalCount">
              {totalCount} total announcement{totalCount === 1 ? "" : "s"}
            </span>

            {totalPages > 1 && (
              <div className="superAdminAnnouncementsPagination">
                <button
                  type="button"
                  className="superAdminAnnouncementsPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="superAdminAnnouncementsPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="superAdminAnnouncementsPageButton"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
