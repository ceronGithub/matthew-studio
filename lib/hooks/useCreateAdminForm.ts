/**
 * FILE: lib/hooks/useCreateAdminForm.ts
 * PURPOSE:
 * Owns all form state and the actual POST for task-97 (Create Admin
 * Account, super_admin_account_specification.md Section 3.2.2). Same
 * manual useState + validate() pattern as lib/hooks/
 * useAdminProductForm.ts and components/auth/RegisterForm.tsx — this
 * project doesn't use react-hook-form/zod anywhere (see
 * AdminProductForm.tsx's own header comment), so this stays
 * consistent with every other form already in the codebase.
 *
 * No CSRF header is sent — POST /api/admin/create-admin doesn't
 * validate one server-side (same family as task-94/95's
 * admin-management routes, unlike app/api/admin/products/route.ts
 * which does check it via useAdminProductForm.ts's getCsrfHeader()
 * call).
 *
 * On a 409 (email already registered), the error is surfaced as a
 * field-level error on Email only — never a generic top-of-form
 * banner — per task-97's explicit scope note.
 */
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ToastType } from "@/components/shared/useToast";

// Section 4.1's known permission strings, with the human-readable
// label/description shown next to each checkbox. Kept local to this
// form rather than imported from a shared constant — no shared
// label map exists yet anywhere else in the codebase (the API
// routes only ever validate against the raw string list).
export const PERMISSION_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "manage-products", label: "Manage Products", description: "Create, edit, and delete products." },
  { value: "manage-orders", label: "Manage Orders", description: "View orders and update their status." },
  {
    value: "manage-users",
    label: "Manage Users",
    description: "View buyers, deactivate/reactivate accounts, reset buyer passwords.",
  },
  { value: "view-analytics", label: "View Analytics", description: "View permitted analytics data." },
  { value: "view-security-logs", label: "View Security Logs", description: "View security event logs." },
  { value: "manage-promotions", label: "Manage Promotions", description: "Create and manage promotional campaigns." },
];

interface FormValues {
  fullName: string;
  email: string;
  permissions: string[];
}

const EMPTY_VALUES: FormValues = { fullName: "", email: "", permissions: [] };

// Strips the characters forbidden across all user-facing text inputs
// (Rule 18.1) — same first line of defense used by RegisterForm.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function useCreateAdminForm(showToast: (message: string, type: ToastType) => void) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const togglePermission = useCallback((permission: string) => {
    setValues((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((existing) => existing !== permission)
        : [...current.permissions, permission],
    }));
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (values.fullName.trim().length < 2) errors.fullName = "Enter a full name (at least 2 characters).";
    if (!isValidEmailFormat(values.email)) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName.trim().replace(FORBIDDEN_CHARACTERS, ""),
          email: values.email.trim(),
          permissions: values.permissions,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        // 409 = email already registered — inline on the Email field
        // only, never a generic banner (task-97's explicit scope note).
        if (response.status === 409) {
          setFieldErrors({ email: result.message ?? "An account with this email already exists." });
        } else {
          showToast(`✕ ${result.message ?? "We couldn't create the admin account. Please try again."}`, "error");
        }
        setIsSubmitting(false);
        return;
      }

      showToast(`✓ Admin account created. Credentials sent to ${result.data.email}.`, "success");
      // Brief delay so the toast is visible before navigating away —
      // same precedent as useBuyerOrderDetail.ts's reorder() redirect.
      setTimeout(() => router.push(`/superAdmin/admin-management/${result.data.adminId}`), 900);
    } catch {
      showToast("✕ We couldn't reach the server. Check your connection and try again.", "error");
      setIsSubmitting(false);
    }
  }

  return { values, setField, togglePermission, fieldErrors, isSubmitting, handleSubmit };
}
