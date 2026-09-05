/**
 * FILE: components/buyer/NewSupportTicketForm.tsx
 * ROLE: Buyer only — rendered inside SupportTicketsList.tsx on
 * /buyer/support (Task 09).
 *
 * PURPOSE:
 * Subject + message fields, POSTs to /api/buyer/support (Task 08).
 * Mirrors the mandatory field-level validation already enforced
 * server-side (subject >= 3 chars, message >= 10 chars) so the buyer
 * sees the same rule before submitting, not just after a 400 comes
 * back. Disables the submit button while sending (Rule 34.3) and
 * shows inline errors below each field rather than an alert().
 *
 * The optional orderId prop is pre-filled read-only context for a
 * ticket opened from an order (wired end-to-end in Task 10, which
 * updates OrderTrackingDetail.tsx's "Contact Support" button to link
 * here with ?orderId=... in the query string) — this form already
 * reads that value from the URL via the parent page and threads it
 * through, so Task 10 only needs to change the link source, not this
 * form.
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { getCsrfHeader } from "@/lib/csrf";

interface NewSupportTicketFormProps {
  orderId: string | null;
  onCancel: () => void;
  onCreated: () => void;
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

interface FieldErrors {
  subject?: string;
  message?: string;
}

export default function NewSupportTicketForm({ orderId, onCancel, onCreated, showToast }: NewSupportTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mirrors the server-side minimums in app/api/buyer/support/route.ts
  // so the buyer sees the same rule before submitting, not only after
  // a 400 response comes back.
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (subject.trim().length < 3) errors.subject = "Enter a subject with at least 3 characters.";
    if (message.trim().length < 10) errors.message = "Tell us more — your message should be at least 10 characters.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/buyer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), orderId }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message || "We couldn't submit your ticket. Please try again.", "error");
        setIsSubmitting(false);
        return;
      }

      showToast("✓ Support ticket submitted. We'll get back to you soon.", "success");
      setSubject("");
      setMessage("");
      onCreated();
    } catch {
      showToast("✕ We couldn't reach the server. Check your connection and try again.", "error");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="newTicketForm" onSubmit={handleSubmit} noValidate>
      <p className="newTicketFormLegend">* Required fields</p>

      {orderId && <p className="newTicketFormOrderNote">Linked to order #{orderId.slice(-8)}</p>}

      <label className="newTicketFormField">
        <span>
          Subject <span aria-hidden="true">*</span>
        </span>
        <input
          type="text"
          autoFocus
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-invalid={Boolean(fieldErrors.subject)}
        />
        {fieldErrors.subject && <span role="alert" className="newTicketFormError">{fieldErrors.subject}</span>}
      </label>

      <label className="newTicketFormField">
        <span>
          Message <span aria-hidden="true">*</span>
        </span>
        <textarea
          rows={5}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(fieldErrors.message)}
        />
        {fieldErrors.message && <span role="alert" className="newTicketFormError">{fieldErrors.message}</span>}
      </label>

      <div className="newTicketFormActions">
        <button type="button" className="newTicketFormCancel" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="newTicketFormSubmit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={16} className="buyerSpin" /> : null}
          {isSubmitting ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
