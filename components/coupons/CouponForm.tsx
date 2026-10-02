/**
 * FILE: components/coupons/CouponForm.tsx
 * ROLE: Super-admin only — rendered as a modal inside
 * components/coupons/CouponManager.tsx, never a separate route.
 *
 * PURPOSE:
 * task-54g: Create Coupon form — code, discount type, value, optional
 * category, optional usage limit, optional expiry. All rules come from
 * lib/couponValidation.ts through lib/hooks/useCouponForm.ts, so the
 * messages shown here are the same ones the API would return.
 *
 * The caller owns whether the modal is open. This component is unmounted
 * (not just hidden) when closed, so no stale form state survives a cancel.
 */
"use client";

import { Loader2 } from "lucide-react";
import { useCouponForm } from "@/lib/hooks/useCouponForm";
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";

interface CouponFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function CouponForm({ isOpen, onClose, onSaved }: CouponFormProps) {
  const { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit } = useCouponForm(onSaved);

  if (!isOpen) return null;

  const isFreeShipping = values.discountType === "free_shipping";
  // Free shipping only applies to t-shirt orders, so no other category is offered.
  const categoryOptions = isFreeShipping
    ? CATEGORY_SHOWCASE.filter((category) => category.slug === "tshirts")
    : CATEGORY_SHOWCASE;

  return (
    <div className="couponFormBackdrop" role="dialog" aria-modal="true" aria-labelledby="couponFormTitle">
      <div className="couponFormDialog">
        <h2 id="couponFormTitle" className="couponFormTitle">Create Coupon</h2>

        <form className="couponForm" onSubmit={handleSubmit} noValidate>
          <p className="couponFormLegend">* Required fields</p>

          <label className="couponFormField">
            <span>Code <span aria-hidden="true">*</span></span>
            <input
              type="text"
              autoFocus
              required
              maxLength={32}
              autoCapitalize="characters"
              value={values.code}
              // Only letters and digits can ever be typed at checkout (Rule 18.1 strips the rest),
              // so anything else is dropped here and the code is shown in capitals.
              onChange={(event) => setField("code", event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
              aria-invalid={Boolean(fieldErrors.code)}
            />
            {fieldErrors.code && <span role="alert" className="couponFormError">{fieldErrors.code}</span>}
          </label>

          <div className="couponFormRow">
            <label className="couponFormField">
              <span>Discount type <span aria-hidden="true">*</span></span>
              <select
                value={values.discountType}
                onChange={(event) => setField("discountType", event.target.value)}
                aria-invalid={Boolean(fieldErrors.discountType)}
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off (₱)</option>
                <option value="free_shipping">Free shipping (t-shirts)</option>
              </select>
              {fieldErrors.discountType && (
                <span role="alert" className="couponFormError">{fieldErrors.discountType}</span>
              )}
            </label>

            {!isFreeShipping && (
              <label className="couponFormField">
                <span>
                  {values.discountType === "percentage" ? "Percent off (1-100)" : "Peso amount off"}{" "}
                  <span aria-hidden="true">*</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={values.discountValue}
                  onChange={(event) => setField("discountValue", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.discountValue)}
                />
                {fieldErrors.discountValue && (
                  <span role="alert" className="couponFormError">{fieldErrors.discountValue}</span>
                )}
              </label>
            )}
          </div>

          <label className="couponFormField">
            <span>Category (optional)</span>
            <select
              value={values.scopeCategory}
              onChange={(event) => setField("scopeCategory", event.target.value)}
              aria-invalid={Boolean(fieldErrors.scopeCategory)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
            {fieldErrors.scopeCategory && (
              <span role="alert" className="couponFormError">{fieldErrors.scopeCategory}</span>
            )}
          </label>

          <div className="couponFormRow">
            <label className="couponFormField">
              <span>Usage limit (optional)</span>
              <input
                type="number"
                inputMode="numeric"
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
              <span>Expires at (optional)</span>
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

          {submitError && <p role="alert" className="couponFormSubmitError">{submitError}</p>}

          <div className="couponFormActions">
            <button type="button" className="couponFormCancelButton" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="couponFormSubmitButton" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="couponFormSpin" /> : null}
              {isSubmitting ? "Saving…" : "Create coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
