/**
 * FILE: components/admin/AdminProductForm.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/products/create/page.tsx and
 * app/admin/products/[productId]/edit/page.tsx.
 *
 * PURPOSE:
 * The last piece of Product CRUD (Task 23, admin_account_
 * specification.md Section 3.2.2). Same manual useState + validate()
 * pattern as components/buyer/NewSupportTicketForm.tsx — this
 * project doesn't use react-hook-form/zod anywhere, so this stays
 * consistent with every other form already in the codebase rather
 * than introducing a new pattern for one form.
 *
 * Media fields (cover image, gallery, preview video) — Task 27,
 * product_media_upload_specification.md. Only rendered in edit mode:
 * a product needs to exist (have an id) before media can be attached
 * to products/<productId>/..., so create mode still shows a short
 * explanatory note instead of the upload controls.
 */
"use client";

import { Loader2, ImageOff } from "lucide-react";
import { useAdminProductForm } from "@/lib/hooks/useAdminProductForm";
import { CATEGORY_LABELS } from "@/lib/adminProductValidation";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AdminProductMedia from "@/components/admin/AdminProductMedia";

const DESCRIPTION_MAX_LENGTH = 1000;

export default function AdminProductForm({ productId }: { productId: string | null }) {
  const {
    values,
    setField,
    fieldErrors,
    isLoading,
    loadError,
    isSubmitting,
    submitError,
    handleSubmit,
    isEditMode,
  } = useAdminProductForm(productId);

  // Single toast stack for this page — passed down to AdminProductMedia
  // (Rule 22.4) rather than that component owning its own instance.
  const { toasts, showToast, dismissToast } = useToast();

  if (isLoading) {
    return (
      <div className="adminProductFormSkeleton">
        <div className="adminProductFormSkeletonLine skeletonBlock" />
        <div className="adminProductFormSkeletonLine skeletonBlock" />
        <div className="adminProductFormSkeletonLine skeletonBlock adminProductFormSkeletonLine--short" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="adminProductFormErrorState">
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <form className="adminProductForm" onSubmit={handleSubmit} noValidate>
      <p className="adminProductFormLegend">* Required fields</p>

      <label className="adminProductFormField">
        <span>
          Product name <span aria-hidden="true">*</span>
        </span>
        <input
          type="text"
          autoFocus
          required
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name && <span role="alert" className="adminProductFormError">{fieldErrors.name}</span>}
      </label>

      <label className="adminProductFormField">
        <span>
          Category <span aria-hidden="true">*</span>
        </span>
        <select
          required
          value={values.category}
          onChange={(event) => setField("category", event.target.value)}
          aria-invalid={Boolean(fieldErrors.category)}
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldErrors.category && <span role="alert" className="adminProductFormError">{fieldErrors.category}</span>}
      </label>

      <label className="adminProductFormField">
        <span>
          Description <span aria-hidden="true">*</span>
        </span>
        <textarea
          rows={5}
          required
          maxLength={DESCRIPTION_MAX_LENGTH}
          value={values.description}
          onChange={(event) => setField("description", event.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
        />
        <span className="adminProductFormCharCount">
          {values.description.length} / {DESCRIPTION_MAX_LENGTH}
        </span>
        {fieldErrors.description && (
          <span role="alert" className="adminProductFormError">{fieldErrors.description}</span>
        )}
      </label>

      <label className="adminProductFormField">
        <span>
          Starting price (₱) <span aria-hidden="true">*</span>
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={values.price}
          onChange={(event) => setField("price", event.target.value)}
          aria-invalid={Boolean(fieldErrors.price)}
        />
        {fieldErrors.price && <span role="alert" className="adminProductFormError">{fieldErrors.price}</span>}
      </label>

      <fieldset className="adminProductFormStatusFieldset">
        <legend>Status</legend>
        <label className="adminProductFormRadio">
          <input
            type="radio"
            name="status"
            value="draft"
            checked={values.status === "draft"}
            onChange={() => setField("status", "draft")}
          />
          Draft
        </label>
        <label className="adminProductFormRadio">
          <input
            type="radio"
            name="status"
            value="published"
            checked={values.status === "published"}
            onChange={() => setField("status", "published")}
          />
          Published
        </label>
      </fieldset>

      <label className="adminProductFormField">
        <span>Tags (comma separated, optional)</span>
        <input
          type="text"
          value={values.tags}
          onChange={(event) => setField("tags", event.target.value)}
        />
      </label>

      <label className="adminProductFormCheckbox">
        <input
          type="checkbox"
          checked={values.featured}
          onChange={(event) => setField("featured", event.target.checked)}
        />
        Feature this product (shows a &quot;New&quot; badge)
      </label>

      {isEditMode && productId ? (
        <AdminProductMedia productId={productId} showToast={showToast} />
      ) : (
        <div className="adminProductFormMediaPlaceholder">
          <ImageOff size={20} />
          <div>
            <p className="adminProductFormMediaTitle">Cover image, gallery &amp; preview video</p>
            <p className="adminProductFormMediaSubtitle">Save this product first, then add media.</p>
          </div>
        </div>
      )}

      {submitError && <p role="alert" className="adminProductFormSubmitError">{submitError}</p>}

      <div className="adminProductFormActions">
        <button type="submit" className="adminProductFormSubmit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={16} className="adminProductFormSpin" /> : null}
          {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Create product"}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </form>
  );
}
