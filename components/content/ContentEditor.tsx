/**
 * FILE: components/content/ContentEditor.tsx
 * ROLE: Super-admin only — rendered inside app/superAdmin/content/page.tsx.
 *
 * PURPOSE:
 * task-115 — orchestrates the two-panel CMS layout: SectionTree
 * (left, list of sections) and SectionForm (right, selected section's
 * editor). Owns both data hooks (list + selected-section detail) and
 * the single shared toast instance, passing callbacks down to
 * SectionForm rather than each panel wiring its own state
 * (Rule 22.4's sub-component pattern). Handles the section-LIST's
 * three data states (Rule 25) itself; SectionForm handles the
 * selected section's own states independently, since the two fetches
 * are unrelated (the list can load fine while a specific section
 * fails, and vice versa).
 */
"use client";

import { useState } from "react";
import { FolderTree } from "lucide-react";
import { useContentSections } from "@/lib/hooks/useContentSections";
import { useContentSectionEditor } from "@/lib/hooks/useContentSectionEditor";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import SectionTree from "@/components/content/SectionTree";
import SectionForm from "@/components/content/SectionForm";

export default function ContentEditor() {
  const { sections, isLoading: isListLoading, error: listError, refetch } = useContentSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const editor = useContentSectionEditor(selectedSectionId);
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <section className="contentEditorLayout">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="contentEditorGrid">
        <div className="contentEditorTreePanel">
          {isListLoading ? (
            <div className="contentEditorTreeSkeleton">
              <div className="contentEditorTreeSkeletonLine skeletonBlock" />
              <div className="contentEditorTreeSkeletonLine skeletonBlock" />
              <div className="contentEditorTreeSkeletonLine skeletonBlock" />
            </div>
          ) : listError ? (
            <div className="contentEditorTreeEmptyState">
              <FolderTree size={28} />
              <p>{listError}</p>
              <button type="button" className="contentEditorTreeRetryButton" onClick={refetch}>
                Try again
              </button>
            </div>
          ) : sections.length === 0 ? (
            <div className="contentEditorTreeEmptyState">
              <FolderTree size={28} />
              <p>No content sections yet.</p>
            </div>
          ) : (
            <SectionTree sections={sections} selectedSectionId={selectedSectionId} onSelect={setSelectedSectionId} />
          )}
        </div>

        <div className="contentEditorFormPanel">
          <SectionForm
            section={editor.section}
            versions={editor.versions}
            isLoading={editor.isLoading}
            error={selectedSectionId ? editor.error : null}
            isPublishing={editor.isPublishing}
            isReverting={editor.isReverting}
            onPublish={editor.publish}
            onRevert={editor.revert}
            showToast={showToast}
          />
        </div>
      </div>
    </section>
  );
}
