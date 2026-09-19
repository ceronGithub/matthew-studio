/**
 * FILE: components/announcements/AnnouncementForm.tsx
 * ROLE: Super-admin only — rendered inside
 * components/announcements/AnnouncementsList.tsx as a modal overlay,
 * never a separate route (task-118b).
 *
 * PURPOSE:
 * task-118b, super_admin_account_specification.md Section 3.9:
 * Create/edit form for a single announcement — Title, Message (with
 * character counter, Rule 34.3), Placement dropdown, Publish-at
 * datetime, Expires-at datetime (optional), Status toggle. Frontend
 * validation mirrors the server's lib/adminAnnouncementValidation.ts
 * via lib/hooks/useAnnouncementForm.ts.
 *
 * Modal shell (backdrop + dialog, Rule 34.4 shape) rather than the
 * routed page-per-form pattern used by AdminProductForm — matches
 * this task's own spec ("opens the form" / "opens the same form
 * pre-filled"), and reuses the same CSS shape as
 * components/shared/ConfirmationModal.tsx for visual consistency.
 *
 * The caller (AnnouncementsList) owns whether the modal is open and
 * which announcement (if any) is being edited — this component is
 * unmounted, not just hidden, when isOpen is false, so no stale form
 * state survives closing without a save.
 */
"use client";

import { Loader2 } from "lucide-react";
import { useAnnouncementForm } from "@/lib/hooks/useAnnouncementForm";
import { MESSAGE_MAX_LENGTH } from "@/lib/adminAnnouncementValidation";
import type { AnnouncementListItem } from "@/lib/hooks/useAnnouncements";

const PLACEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "homepage-banner", label: "Homepage Banner" },
  { value: "shop-banner", label: "Shop Banner" },
  { value: "login-toast", label: "Login Toast" },
];

interface AnnouncementFormProps {
  isOpen: boolean;
  existing: AnnouncementListItem | null; // null = create mode
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function AnnouncementForm({ isOpen, existing, onClose, onSaved }: AnnouncementFormProps) {
  const { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit, isEditMode } =
    useAnnouncementForm(existing, onSaved);

  if (!isOpen) return null;

  return (
    <div className="announcementFormBackdrop" role="dialog" aria-modal="true" aria-labelledby="announcementFormTitle">
      <div className="announcementFormDialog">
        <h2 id="announcementFormTitle" className="announcementFormTitle">
          {isEditMode ? "Edit Announcement" : "Create Announcement"}
        </h2>

        <form className="announcementForm" onSubmit={handleSubmit} noValidate>
          <p className="announcementFormLegend">* Required fields</p>

          <label className="announcementFormField">
            <span>
              Title <span aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              autoFocus
              required
              value={values.title}
              onChange={(event) => setField("title", event.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title && <span role="alert" className="announcementFormError">{fieldErrors.title}</span>}
          </label>

          <label className="announcementFormField">
            <span>
              Message <span aria-hidden="true">*</span>
            </span>
            <textarea
              rows={4}
              required
              maxLength={MESSAGE_MAX_LENGTH}
              value={values.message}
              onChange={(event) => setField("message", event.target.value)}
              aria-invalid={Boolean(fieldErrors.message)}
            />
            <span className="announcementFormCharCount">
              {values.message.length} / {MESSAGE_MAX_LENGTH}
            </span>
            {fieldErrors.message && <span role="alert" className="announcementFormError">{fieldErrors.message}</span>}
          </label>

          <label className="announcementFormField">
            <span>
              Placement <span aria-hidden="true">*</span>
            </span>
            <select
              required
              value={values.placement}
              onChange={(event) => setField("placement", event.target.value)}
              aria-invalid={Boolean(fieldErrors.placement)}
            >
              <option value="" disabled>
                Choose a placement…
              </option>
              {PLACEMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.placement && (
              <span role="alert" className="announcementFormError">{fieldErrors.placement}</span>
            )}
          </label>

          <div className="announcementFormRow">
            <label className="announcementFormField">
              <span>
                Publish at <span aria-hidden="true">*</span>
              </span>
              <input
                type="datetime-local"
                required
                value={values.publishAt}
                onChange={(event) => setField("publishAt", event.target.value)}
                aria-invalid={Boolean(fieldErrors.publishAt)}
              />
              {fieldErrors.publishAt && (
                <span role="alert" className="announcementFormError">{fieldErrors.publishAt}</span>
              )}
            </label>

            <label className="announcementFormField">
              <span>Expires at (optional)</span>
              <input
                type="datetime-local"
                value={values.expiresAt}
                onChange={(event) => setField("expiresAt", event.target.value)}
                aria-invalid={Boolean(fieldErrors.expiresAt)}
              />
              {fieldErrors.expiresAt && (
                <span role="alert" className="announcementFormError">{fieldErrors.expiresAt}</span>
              )}
            </label>
          </div>

          <fieldset className="announcementFormStatusFieldset">
            <legend>Status</legend>
            <label className="announcementFormRadio">
              <input
                type="radio"
                name="announcementStatus"
                value="draft"
                checked={values.status === "draft"}
                onChange={() => setField("status", "draft")}
              />
              Draft
            </label>
            <label className="announcementFormRadio">
              <input
                type="radio"
                name="announcementStatus"
                value="scheduled"
                checked={values.status === "scheduled"}
                onChange={() => setField("status", "scheduled")}
              />
              Scheduled
            </label>
            <label className="announcementFormRadio">
              <input
                type="radio"
                name="announcementStatus"
                value="live"
                checked={values.status === "live"}
                onChange={() => setField("status", "live")}
              />
              Live
            </label>
          </fieldset>

          {submitError && <p role="alert" className="announcementFormSubmitError">{submitError}</p>}

          <div className="announcementFormActions">
            <button type="button" className="announcementFormCancelButton" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="announcementFormSubmitButton" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="announcementFormSpin" /> : null}
              {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Create announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
