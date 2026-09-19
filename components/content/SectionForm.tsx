/**
 * FILE: components/content/SectionForm.tsx
 * ROLE: Super-admin only — right panel of ContentEditor.tsx.
 *
 * PURPOSE:
 * Header (section label + last-updated-by), Preview/Publish buttons,
 * the field editor (ContentFieldRenderer), and the version-history
 * list with Revert (Rule 34.4 confirmation modal, named per version).
 * Handles this panel's own three data states (Rule 25) for the
 * detail fetch; ContentEditor.tsx owns the actual fetch/mutation
 * hook and passes everything down as props (Rule 22.4's pattern).
 *
 * PREVIEW URL NOTE: there is no sectionKey -> live-page mapping
 * anywhere in the codebase yet (no ContentSection rows exist to have
 * defined one). previewPathFor() below is a disclosed best-effort
 * heuristic against the real folder names under app/(public)/ — not
 * a verified routing table. Update it once real sectionKeys exist.
 */
"use client";

import { useEffect, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import ContentFieldRenderer from "@/components/content/ContentFieldRenderer";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import type { ContentSectionDetail, ContentVersionListItem } from "@/lib/hooks/useContentSectionEditor";
import type { ToastType } from "@/components/shared/useToast";

function previewPathFor(sectionKey: string): string {
  const [area, ...rest] = sectionKey.split(".");
  if (area === "homepage" || area === "sitewide") return "/";
  if (area === "shop") return "/shop";
  if (area === "page" && rest.length > 0) return `/${rest[0]}`;
  return "/";
}

function formatVersionLabel(version: ContentVersionListItem): string {
  const savedAt = new Date(version.createdAt).toLocaleString();
  return version.savedBy ? `${savedAt} — saved by ${version.savedBy}` : savedAt;
}

interface SectionFormProps {
  section: ContentSectionDetail | null;
  versions: ContentVersionListItem[];
  isLoading: boolean;
  error: string | null;
  isPublishing: boolean;
  isReverting: boolean;
  onPublish: (data: Record<string, unknown>) => Promise<{ success: boolean; message: string }>;
  onRevert: (versionId: string) => Promise<{ success: boolean; message: string }>;
  showToast: (message: string, type?: ToastType) => void;
}

export default function SectionForm({
  section,
  versions,
  isLoading,
  error,
  isPublishing,
  isReverting,
  onPublish,
  onRevert,
  showToast,
}: SectionFormProps) {
  const [editedData, setEditedData] = useState<Record<string, unknown>>({});
  const [pendingRevertVersion, setPendingRevertVersion] = useState<ContentVersionListItem | null>(null);

  // Reset the working copy whenever a different (or freshly re-fetched)
  // section loads — never carry edits over from a previously selected
  // section into this one.
  useEffect(() => {
    setEditedData(section?.data ?? {});
  }, [section]);

  if (isLoading) {
    return (
      <div className="sectionFormSkeleton">
        <div className="sectionFormSkeletonLine skeletonBlock" />
        <div className="sectionFormSkeletonLine skeletonBlock" />
        <div className="sectionFormSkeletonLine skeletonBlock sectionFormSkeletonLine--short" />
      </div>
    );
  }

  if (error) {
    return <p className="sectionFormErrorState">{error}</p>;
  }

  if (!section) {
    return <p className="sectionFormEmptyState">Select a section on the left to edit it.</p>;
  }

  async function handlePublish() {
    const result = await onPublish(editedData);
    showToast(result.success ? `✓ ${result.message}` : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleConfirmRevert() {
    if (!pendingRevertVersion) return;
    const result = await onRevert(pendingRevertVersion.id);
    showToast(result.success ? `✓ ${result.message}` : `✕ ${result.message}`, result.success ? "success" : "error");
    setPendingRevertVersion(null);
  }

  return (
    <article className="sectionForm">
      <header className="sectionFormHeader">
        <div>
          <h2 className="sectionFormTitle">{section.label}</h2>
          <p className="sectionFormMeta">
            {section.updatedBy
              ? `Last published by ${section.updatedBy} on ${new Date(section.updatedAt).toLocaleString()}`
              : "Never published yet."}
          </p>
        </div>
        <div className="sectionFormActions">
          <a
            className="sectionFormPreviewButton"
            href={previewPathFor(section.sectionKey)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye size={16} />
            Preview
          </a>
          <button
            type="button"
            className="sectionFormPublishButton"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>

      <ContentFieldRenderer data={editedData} onChange={setEditedData} />

      <div className="sectionFormVersionHistory">
        <h3 className="sectionFormVersionHistoryTitle">Version history</h3>
        {versions.length === 0 ? (
          <p className="sectionFormVersionEmptyNote">No prior versions yet — publish once to start building history.</p>
        ) : (
          <ul className="sectionFormVersionList">
            {versions.map((version) => (
              <li className="sectionFormVersionRow" key={version.id}>
                <span className="sectionFormVersionLabel">{formatVersionLabel(version)}</span>
                <button
                  type="button"
                  className="sectionFormRevertButton"
                  onClick={() => setPendingRevertVersion(version)}
                  disabled={isReverting}
                >
                  <RotateCcw size={14} />
                  Revert to this
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmationModal
        isOpen={pendingRevertVersion !== null}
        title="Revert this section?"
        description={
          pendingRevertVersion
            ? `Are you sure you want to revert "${section.label}" to the version saved ${formatVersionLabel(
                pendingRevertVersion
              )}? The current published data will be saved as a new version first, so this can be undone.`
            : ""
        }
        confirmLabel="Revert"
        onConfirm={handleConfirmRevert}
        onCancel={() => setPendingRevertVersion(null)}
      />
    </article>
  );
}
