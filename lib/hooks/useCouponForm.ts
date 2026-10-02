/**
 * FILE: lib/hooks/useCouponForm.ts
 * PURPOSE:
 * Client-side state for the Create Coupon form (task-54g,
 * additional_platform_gaps_specification.md Section 4.1). Validation reuses
 * createCouponSchema from lib/couponValidation.ts — the same zod schema the
 * API runs — so the form and the server can never disagree about what a
 * valid coupon is. react-hook-form is not installed in this project (every
 * other form uses plain useState), so this hook follows
 * lib/hooks/useAnnouncementForm.ts instead of adding a new dependency.
 *
 * DATA FLOW:
 * 1. The form keeps every field as text (what the inputs hold).
 * 2. On submit, toPayload() turns the text into the shapes the schema wants
 *    (numbers, null for blank optional fields, an ISO date).
 * 3. createCouponSchema.safeParse() -> field errors shown under each input.
 * 4. Valid -> POST /api/superadmin/coupons. A 409 (duplicate code) is shown
 *    under the Code field; any other failure shows a message above the buttons.
 * 5. Success -> onSaved(message) so the list can close the modal and refetch.
 */
"use client";

import { useState, type FormEvent } from "react";
import { getCsrfHeader } from "@/lib/csrf";
import { createCouponSchema } from "@/lib/couponValidation";

export interface CouponFormValues {
  code: string;
  discountType: string;
  discountValue: string;
  scopeCategory: string; // "" = all categories
  usageLimit: string; // "" = unlimited
  expiresAt: string; // datetime-local value, "" = never expires
}

export type CouponFieldErrors = Partial<Record<keyof CouponFormValues, string>>;

const BLANK_VALUES: CouponFormValues = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  scopeCategory: "",
  usageLimit: "",
  expiresAt: "",
};

/**
 * toPayload
 * Converts the text the inputs hold into what the API expects. Free
 * shipping has no value, so it is always sent as 0 whatever is typed.
 */
function toPayload(values: CouponFormValues) {
  return {
    code: values.code,
    discountType: values.discountType,
    discountValue: values.discountType === "free_shipping" ? 0 : Number(values.discountValue),
    scopeCategory: values.scopeCategory === "" ? null : values.scopeCategory,
    usageLimit: values.usageLimit.trim() === "" ? null : Number(values.usageLimit),
    expiresAt: values.expiresAt === "" ? null : toIsoOrRaw(values.expiresAt),
  };
}

// An unreadable date is passed through as text so the schema reports it.
function toIsoOrRaw(datetimeLocal: string): string {
  const date = new Date(datetimeLocal);
  return Number.isNaN(date.getTime()) ? datetimeLocal : date.toISOString();
}

export function useCouponForm(onSaved: (message: string) => void) {
  const [values, setValues] = useState<CouponFormValues>(BLANK_VALUES);
  const [fieldErrors, setFieldErrors] = useState<CouponFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField(field: keyof CouponFormValues, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Free shipping only applies to t-shirts and has no value, so the
      // form clears whatever no longer fits when the type changes.
      if (field === "discountType" && value === "free_shipping") {
        next.discountValue = "";
        if (next.scopeCategory !== "tshirts") next.scopeCategory = "";
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    const parsed = createCouponSchema.safeParse(toPayload(values));
    if (!parsed.success) {
      const errors: CouponFieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CouponFormValues | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/superadmin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(toPayload(values)),
      });
      const result = await response.json();

      if (result.success) {
        onSaved(result.message);
        return;
      }
      if (response.status === 409) {
        setFieldErrors({ code: result.message });
      } else {
        setSubmitError(result.message ?? "We couldn't create the coupon. Please try again.");
      }
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit };
}
