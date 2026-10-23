/**
 * FILE: components/buyer/RefundRequestForm.tsx
 * ROLE: Buyer only — rendered as a modal by
 * components/buyer/OrderTrackingDetail.tsx, never a separate route.
 *
 * PURPOSE:
 * task-55c: the Request Refund form — a reason dropdown (required) and an
 * optional note with a live character counter. Rules and messages come from
 * lib/refundValidation.ts through lib/hooks/useRefundRequest.ts, so what the
 * buyer sees here matches what the API would answer. Nothing is refunded by
 * submitting: the request waits for an admin to review it.
 *
 * The caller mounts this only while the modal is open, so no stale form
 * state survives a cancel.
 */
"use client";

import { Loader2 } from "lucide-react";
import { useRefundRequest } from "@/lib/hooks/useRefundRequest";
import { REFUND_NOTE_MAX_LENGTH, REFUND_REASONS } from "@/lib/refundValidation";

interface RefundRequestFormProps {
  orderId: string;
  orderShortId: string;
  onClose: () => void;
  onSubmitted: (message: string) => void;
  onFailed: (message: string, httpStatus: number) => void;
}

export default function RefundRequestForm({
  orderId,
  orderShortId,
  onClose,
  onSubmitted,
  onFailed,
}: RefundRequestFormProps) {
  const { values, setField, fieldErrors, isSubmitting, submitError, handleSubmit } = useRefundRequest(
    orderId,
    onSubmitted,
    onFailed
  );

  return (
    <div className="refundFormBackdrop" role="dialog" aria-modal="true" aria-labelledby="refundFormTitle">
      <div className="refundFormDialog">
        <h2 id="refundFormTitle" className="refundFormTitle">Request a refund</h2>
        <p className="refundFormIntro">
          Order #{orderShortId}. We&apos;ll review your request within 2-3 business days and email you the result.
        </p>

        <form className="refundForm" onSubmit={handleSubmit} noValidate>
          <p className="refundFormLegend">* Required fields</p>

          <label className="refundFormField">
            <span>Reason <span aria-hidden="true">*</span></span>
            <select
              autoFocus
              required
              value={values.reason}
              onChange={(event) => setField("reason", event.target.value)}
              aria-invalid={Boolean(fieldErrors.reason)}
            >
              <option value="">Choose a reason…</option>
              {REFUND_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
            {fieldErrors.reason && <span role="alert" className="refundFormError">{fieldErrors.reason}</span>}
          </label>

          <label className="refundFormField">
            <span>Note (optional)</span>
            <textarea
              rows={4}
              maxLength={REFUND_NOTE_MAX_LENGTH}
              value={values.note}
              onChange={(event) => setField("note", event.target.value)}
              aria-invalid={Boolean(fieldErrors.note)}
            />
            <span className="refundFormCounter">{values.note.length} / {REFUND_NOTE_MAX_LENGTH}</span>
            {fieldErrors.note && <span role="alert" className="refundFormError">{fieldErrors.note}</span>}
          </label>

          {submitError && <p role="alert" className="refundFormSubmitError">{submitError}</p>}

          <div className="refundFormActions">
            <button type="button" className="refundFormCancelButton" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="refundFormSubmitButton" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="refundFormSpin" /> : null}
              {isSubmitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
