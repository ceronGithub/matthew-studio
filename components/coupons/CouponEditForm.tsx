/**
 * FILE: components/coupons/CouponEditForm.tsx
 * ROLE: Super-admin only — rendered as a modal inside
 * components/coupons/CouponManager.tsx, never a separate route.
 *
 * PURPOSE:
 * task-54h: change one coupon's usage limit and expiry. Code, discount type,
 * value and category stay locked (past orders may have used them), so they
 * appear only as a read-only summary at the top. All rules come from
 * lib/couponValidation.ts through lib/hooks/useCouponEdit.ts.
 *
 * The caller mounts this only while a coupon is being edited, so no stale
 * form state survives a cancel. Styles reuse the couponForm* classes from
 * app/styles/superAdminCoupons.css, the same dialog as Create Coupon.
 */
"use client";

import { Loader2 } from "lucide-react";
import { useCouponEdit } from "@/lib/hooks/useCouponEdit";
import type { CouponListItem } from "@/lib/hooks/useCoupons";

interface CouponEditFormProps {
  coupon: CouponListItem;
  onClose: () => void;
  onSaved: (message: string) => void;
  onFailed: (message: string) => void;
}

export default function CouponEditForm({ coupon, onClose, onSaved, onFailed }: CouponEditFormProps) {
  const { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit } = useCouponEdit(
    coupon,
    onSaved,
    onFailed
  );

  return (
    <div className="couponFormBackdrop" role="dialog" aria-modal="true" aria-labelledby="couponEditTitle">
      <div className="couponFormDialog">
        <h2 id="couponEditTitle" className="couponFormTitle">Edit {coupon.code}</h2>

        <p className="couponFormLockedNote">
          Used {coupon.usageCount} time{coupon.usageCount === 1 ? "" : "s"}. The code, discount and category can&apos;t
          be changed — switch this coupon off and create a new one instead.
        </p>

        <form className="couponForm" onSubmit={handleSubmit} noValidate>
          <div className="couponFormRow">
            <label className="couponFormField">
              <span>Usage limit</span>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                min={1}
                step={1}
                placeholder="Unlimited"
                value={values.usageLimit}
                onChange={(event) => setField("usageLimit", event.target.value)}
                aria-invalid={Boolean(fieldErrors.usageLimit)}
              />
              {fieldErrors.usageLimit && (
                <span role="alert" className="couponFormError">{fieldErrors.usageLimit}</span>
              )}
            </label>

            <label className="couponFormField">
              <span>Expires at</span>
              <input
                type="datetime-local"
                value={values.expiresAt}
                onChange={(event) => setField("expiresAt", event.target.value)}
                aria-invalid={Boolean(fieldErrors.expiresAt)}
              />
              {fieldErrors.expiresAt && (
                <span role="alert" className="couponFormError">{fieldErrors.expiresAt}</span>
              )}
            </label>
          </div>

          <p className="couponFormHint">Leave a field empty for no limit / no expiry.</p>

          {submitError && <p role="alert" className="couponFormSubmitError">{submitError}</p>}

          <div className="couponFormActions">
            <button type="button" className="couponFormCancelButton" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="couponFormSubmitButton" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="couponFormSpin" /> : null}
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
