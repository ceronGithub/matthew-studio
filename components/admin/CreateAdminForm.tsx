/**
 * FILE: components/admin/CreateAdminForm.tsx
 * ROLE: Super-Admin only — rendered inside
 * app/superAdmin/admin-management/create/page.tsx.
 *
 * PURPOSE:
 * task-97, super_admin_account_specification.md Section 3.2.2 (Create
 * Admin Account): Full Name + Email + a Section 4.1 permission
 * checkbox group, calling POST /api/admin/create-admin (task-99).
 * Follows Rule 34.3's form UX (autofocus, inline errors, disabled
 * submit while submitting, native Enter-to-submit) via the plain
 * useState pattern established across the codebase — see
 * lib/hooks/useCreateAdminForm.ts's header comment.
 *
 * Owns its own ToastStack instance (same precedent as
 * AdminProductForm.tsx) rather than sharing one with the list page,
 * since this is a separate route/page.
 */
"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCreateAdminForm, PERMISSION_OPTIONS } from "@/lib/hooks/useCreateAdminForm";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

export default function CreateAdminForm() {
  const { toasts, showToast, dismissToast } = useToast();
  const { values, setField, togglePermission, fieldErrors, isSubmitting, handleSubmit } =
    useCreateAdminForm(showToast);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <form className="createAdminForm" onSubmit={handleSubmit} noValidate>
        <p className="createAdminFormLegend">* Required fields</p>

        <label className="createAdminFormField">
          <span>
            Full name <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            autoFocus
            required
            value={values.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            placeholder="Jane Dela Cruz"
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
          {fieldErrors.fullName && (
            <span role="alert" className="createAdminFormError">
              {fieldErrors.fullName}
            </span>
          )}
        </label>

        <label className="createAdminFormField">
          <span>
            Email <span aria-hidden="true">*</span>
          </span>
          <input
            type="email"
            required
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            placeholder="name@studio.com"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <span role="alert" className="createAdminFormError">
              {fieldErrors.email}
            </span>
          )}
        </label>

        <fieldset className="createAdminFormPermissionsFieldset">
          <legend>Permissions</legend>
          <p className="createAdminFormPermissionsHint">
            Choose what this admin can access. You can change these later from their account page.
          </p>
          {PERMISSION_OPTIONS.map((permission) => (
            <label key={permission.value} className="createAdminFormPermissionCheckbox">
              <input
                type="checkbox"
                checked={values.permissions.includes(permission.value)}
                onChange={() => togglePermission(permission.value)}
              />
              <span>
                <span className="createAdminFormPermissionLabel">{permission.label}</span>
                <span className="createAdminFormPermissionDescription">{permission.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="createAdminFormActions">
          <Link href="/superAdmin/admin-management" className="createAdminFormCancelLink">
            Cancel
          </Link>
          <button type="submit" className="createAdminFormSubmit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="createAdminFormSpin" /> : null}
            {isSubmitting ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </form>
    </>
  );
}
