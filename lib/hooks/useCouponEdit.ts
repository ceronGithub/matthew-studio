/**
 * FILE: lib/hooks/useCouponEdit.ts
 * PURPOSE:
 * Client-side state for the Edit Coupon modal (task-54h,
 * additional_platform_gaps_specification.md Section 4.1, admin side).
 * Only the usage limit and the expiry can change — code, type, value and
 * category are locked by the API. Validation reuses updateCouponSchema from
 * lib/couponValidation.ts, the same zod schema the PATCH route runs, so the
 * form and the server never disagree. Follows lib/hooks/useCouponForm.ts
 * (plain useState, no react-hook-form in this project).
 *
 * DATA FLOW:
 * 1. The modal opens with the coupon's current limit and expiry as text.
 * 2. On submit, toPayload() turns the text into numbers / null / an ISO date.
 * 3. updateCouponSchema.safeParse() -> field errors under each input.
 * 4. Valid -> PATCH /api/superadmin/coupons/[couponId]. A limit below the
 *    amount already used comes back from the API with its own message,
 *    which is shown under the Usage limit field. Any other failure shows
 *    above the buttons and fires an error toast through onFailed.
 * 5. Success -> onSaved(message) so the list can close the modal and refetch.
 */
"use client";

import { useState, type FormEvent } from "react";
import { getCsrfHeader } from "@/lib/csrf";
import { updateCouponSchema } from "@/lib/couponValidation";
import type { CouponListItem } from "@/lib/hooks/useCoupons";

export interface CouponEditValues {
  usageLimit: string; // "" = unlimited
  expiresAt: string; // datetime-local value, "" = never expires
}

export type CouponEditFieldErrors = Partial<Record<keyof CouponEditValues, string>>;

// Marker the PATCH route puts in "error" when the new limit is below usageCount.
const LIMIT_BELOW_USED_MARKER = "usageLimit below usageCount";
const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

/**
 * toDatetimeLocal
 * A datetime-local input wants "YYYY-MM-DDTHH:mm" in the viewer's own time
 * zone, not the UTC text the API stores, so the saved date is converted.
 */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// An unreadable date is passed through as text so the schema reports it.
function toIsoOrRaw(datetimeLocal: string): string {
  const date = new Date(datetimeLocal);
  return Number.isNaN(date.getTime()) ? datetimeLocal : date.toISOString();
}

function toPayload(values: CouponEditValues) {
  return {
    usageLimit: values.usageLimit.trim() === "" ? null : Number(values.usageLimit),
    expiresAt: values.expiresAt === "" ? null : toIsoOrRaw(values.expiresAt),
  };
}

export function useCouponEdit(
  coupon: CouponListItem,
  onSaved: (message: string) => void,
  onFailed: (message: string) => void
) {
  const startingValues: CouponEditValues = {
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    expiresAt: toDatetimeLocal(coupon.expiresAt),
  };

  const [values, setValues] = useState<CouponEditValues>(startingValues);
  const [fieldErrors, setFieldErrors] = useState<CouponEditFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField(field: keyof CouponEditValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    // Nothing to save if both fields still hold what the coupon already has.
    if (values.usageLimit === startingValues.usageLimit && values.expiresAt === startingValues.expiresAt) {
      setSubmitError("Change the usage limit or the expiry before saving.");
      return;
    }

    const parsed = updateCouponSchema.safeParse(toPayload(values));
    if (!parsed.success) {
      const errors: CouponEditFieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CouponEditValues | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/superadmin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(toPayload(values)),
      });
      const result = await response.json();

      if (result.success) {
        onSaved(result.message);
        return;
      }

      const message = result.message ?? "We couldn't update the coupon. Please try again.";
      if (result.error === LIMIT_BELOW_USED_MARKER) {
        // The API's own wording, shown right under the field that caused it.
        setFieldErrors({ usageLimit: message });
      } else {
        setSubmitError(message);
      }
      onFailed(message);
    } catch {
      setSubmitError(NETWORK_ERROR_MESSAGE);
      onFailed(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit };
}
