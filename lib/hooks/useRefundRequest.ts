/**
 * FILE: lib/hooks/useRefundRequest.ts
 * PURPOSE:
 * Client-side state for the Request Refund form on /buyer/orders/[orderId]
 * (task-55c, additional_platform_gaps_specification.md Section 4.2, buyer
 * side). Validation reuses refundRequestSchema from lib/refundValidation.ts —
 * the same zod schema the API runs — so the form and the server never
 * disagree. Plain useState, like lib/hooks/useCouponForm.ts (react-hook-form
 * is not installed in this project).
 *
 * DATA FLOW:
 * 1. The form keeps the reason and the note as text.
 * 2. On submit, refundRequestSchema.safeParse() -> field errors shown inline.
 * 3. Valid -> POST /api/buyer/orders/[orderId]/refund-request with the CSRF
 *    header. The body carries only reason and note; the amount is worked out
 *    on the server.
 * 4. Success -> onSubmitted(message). Failure -> the message is shown above
 *    the buttons and passed to onFailed(message, httpStatus), so the page can
 *    fire the error toast and react to a 409 (a request is already waiting).
 */
"use client";

import { useState, type FormEvent } from "react";
import { getCsrfHeader } from "@/lib/csrf";
import { refundRequestSchema } from "@/lib/refundValidation";

export interface RefundFormValues {
  reason: string; // "" until the buyer picks one
  note: string;
}

export type RefundFieldErrors = Partial<Record<keyof RefundFormValues, string>>;

const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

// Rule 18.1 characters, minus whitespace — spaces between words must stay typeable.
const FORBIDDEN_NOTE_CHARACTERS = /[<>{}[\]/\\;'"`=-]/g;

export function useRefundRequest(
  orderId: string,
  onSubmitted: (message: string) => void,
  onFailed: (message: string, httpStatus: number) => void
) {
  const [values, setValues] = useState<RefundFormValues>({ reason: "", note: "" });
  const [fieldErrors, setFieldErrors] = useState<RefundFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField(field: keyof RefundFormValues, value: string) {
    // The note silently drops the forbidden characters as they are typed (Rule 18.1).
    const nextValue = field === "note" ? value.replace(FORBIDDEN_NOTE_CHARACTERS, "") : value;
    setValues((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    const parsed = refundRequestSchema.safeParse(values);
    if (!parsed.success) {
      const errors: RefundFieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RefundFormValues | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/buyer/orders/${orderId}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ reason: values.reason, note: values.note }),
      });
      const result = await response.json();

      if (result.success) {
        onSubmitted(result.message);
        return;
      }

      const message = result.message ?? "We couldn't submit your refund request. Please try again.";
      setSubmitError(message);
      onFailed(message, response.status);
    } catch {
      setSubmitError(NETWORK_ERROR_MESSAGE);
      onFailed(NETWORK_ERROR_MESSAGE, 0);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit };
}
