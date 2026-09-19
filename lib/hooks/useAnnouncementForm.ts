/**
 * FILE: lib/hooks/useAnnouncementForm.ts
 * PURPOSE:
 * Client-side state for the Create/Edit Announcement form (task-118b,
 * super_admin_account_specification.md Section 3.9). Same manual
 * useState + validate() pattern as lib/hooks/useAdminProductForm.ts —
 * this project doesn't use react-hook-form/zod anywhere, so this
 * stays consistent with every other form already in the codebase.
 *
 * Unlike the product form, this one is used inside a MODAL rather
 * than a routed page (task-118 spec: "Create Announcement" opens the
 * form; Edit opens the same form pre-filled) — so save() reports
 * success back via onSaved() instead of a router.push redirect, and
 * the caller (AnnouncementForm) is responsible for closing the modal.
 *
 * One hook instance handles both create (existing = null) and edit
 * (existing = the row being edited) — same dual-mode shape as
 * useAdminProductForm's isEditMode.
 */
"use client";

import { useState, type FormEvent } from "react";
import { getCsrfHeader } from "@/lib/csrf";
import { MESSAGE_MAX_LENGTH, VALID_PLACEMENTS, VALID_STATUSES } from "@/lib/adminAnnouncementValidation";
import type { AnnouncementListItem } from "@/lib/hooks/useAnnouncements";

export interface AnnouncementFormValues {
  title: string;
  message: string;
  placement: string;
  status: string;
  publishAt: string; // datetime-local input value, e.g. "2026-09-20T14:30"
  expiresAt: string; // datetime-local input value, or "" for no expiry
}

export interface AnnouncementFieldErrors {
  title?: string;
  message?: string;
  placement?: string;
  status?: string;
  publishAt?: string;
  expiresAt?: string;
}

/**
 * toDatetimeLocalValue
 * Converts an ISO timestamp (as stored/returned by the API) into the
 * "YYYY-MM-DDTHH:mm" shape <input type="datetime-local"> expects.
 * Returns "" for null/invalid input — the field just renders blank.
 */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * nowAsDatetimeLocalValue
 * Default publishAt for a brand-new announcement — "now", pre-filled
 * so a super-admin creating a "live" announcement doesn't have to
 * type a timestamp for the common case.
 */
function nowAsDatetimeLocalValue(): string {
  return toDatetimeLocalValue(new Date().toISOString());
}

function blankValues(): AnnouncementFormValues {
  return {
    title: "",
    message: "",
    placement: "",
    status: "draft",
    publishAt: nowAsDatetimeLocalValue(),
    expiresAt: "",
  };
}

function valuesFromExisting(existing: AnnouncementListItem): AnnouncementFormValues {
  return {
    title: existing.title,
    message: existing.message,
    placement: existing.placement,
    status: existing.status,
    publishAt: toDatetimeLocalValue(existing.publishAt),
    expiresAt: toDatetimeLocalValue(existing.expiresAt),
  };
}

// Mirrors the server-side minimums in lib/adminAnnouncementValidation.ts's
// validateAnnouncementInput() so the admin sees the same rule before
// submitting, not only after a 400 comes back (Rule 34.3).
function validate(values: AnnouncementFormValues): AnnouncementFieldErrors {
  const errors: AnnouncementFieldErrors = {};

  const title = values.title.trim();
  if (title.length < 2 || title.length > 150) {
    errors.title = "Title must be between 2 and 150 characters.";
  }

  const message = values.message.trim();
  if (message.length < 1 || message.length > MESSAGE_MAX_LENGTH) {
    errors.message = `Message is required and must be under ${MESSAGE_MAX_LENGTH} characters.`;
  }

  if (!VALID_PLACEMENTS.includes(values.placement)) {
    errors.placement = "Choose a placement.";
  }

  if (!VALID_STATUSES.includes(values.status)) {
    errors.status = "Status must be Draft, Scheduled, or Live.";
  }

  const publishAt = values.publishAt ? new Date(values.publishAt) : null;
  if (!publishAt || Number.isNaN(publishAt.getTime())) {
    errors.publishAt = "Publish date is required.";
  }

  if (values.expiresAt) {
    const expiresAt = new Date(values.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.expiresAt = "Enter a valid expiry date.";
    } else if (publishAt && !Number.isNaN(publishAt.getTime()) && expiresAt.getTime() <= publishAt.getTime()) {
      errors.expiresAt = "Expiry date must be after the publish date.";
    }
  }

  return errors;
}

export function useAnnouncementForm(existing: AnnouncementListItem | null, onSaved: (message: string) => void) {
  const isEditMode = existing !== null;

  const [values, setValues] = useState<AnnouncementFormValues>(
    existing ? valuesFromExisting(existing) : blankValues()
  );
  const [fieldErrors, setFieldErrors] = useState<AnnouncementFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField<K extends keyof AnnouncementFormValues>(field: K, value: AnnouncementFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        message: values.message.trim(),
        placement: values.placement,
        status: values.status,
        publishAt: new Date(values.publishAt).toISOString(),
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      };

      const response = await fetch(
        isEditMode ? `/api/superadmin/announcements/${existing.id}` : "/api/superadmin/announcements",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (!result.success) {
        setSubmitError(result.message || "We couldn't save the announcement. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSaved(result.message || (isEditMode ? "Announcement saved successfully." : "Announcement created successfully."));
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return {
    values,
    setField,
    fieldErrors,
    isSubmitting,
    submitError,
    handleSubmit,
    isEditMode,
  };
}
