/**
 * FILE: components/support/SupportForm.tsx
 * ROLE: Public — contact form on the Support page (/support).
 *
 * PURPOSE:
 * IMPROVEMENTS.md Section 9's "Contact Form Section": email input,
 * subject dropdown, message textarea, submit button, and success/
 * error feedback — POSTs to /api/support. Lighter than ContactForm
 * (components/contact/ContactForm.tsx), which also collects name,
 * resort name, and tier for demo requests; support requests only
 * need enough to route and reply to the visitor. Disables the submit
 * button while sending to prevent double-submit.
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

const SUPPORT_SUBJECT_OPTIONS = [
  { value: "general", label: "General question" },
  { value: "order-payment", label: "Order / payment issue" },
  { value: "technical", label: "Technical support" },
  { value: "other", label: "Other" },
];

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function SupportForm() {
  const [formValues, setFormValues] = useState({ email: "", subject: "", message: "" });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof typeof formValues, value: string) {
    setFormValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Frontend guard — the API route re-validates server-side regardless
    if (!formValues.email.trim() || !formValues.subject || !formValues.message.trim()) {
      setSubmitState("error");
      setErrorMessage("Please fill in your email, subject, and message.");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const result = await response.json();

      if (!result.success) {
        setSubmitState("error");
        setErrorMessage(result.message || "Something went wrong. Please try again.");
        return;
      }

      setSubmitState("success");
      setFormValues({ email: "", subject: "", message: "" });
    } catch {
      setSubmitState("error");
      setErrorMessage("We couldn't reach the server. Check your connection and try again.");
    }
  }

  if (submitState === "success") {
    return (
      <div className="contactSuccess" role="status">
        <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden="true" />
        <p className="contactSuccessTitle">Message sent</p>
        <p className="contactSuccessText">
          Thanks for reaching out — we&apos;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className="contactForm supportForm" onSubmit={handleSubmit} noValidate>
      <label className="contactFormField">
        <span>
          Email <span aria-hidden="true">*</span>
        </span>
        <input
          type="email"
          autoFocus
          required
          value={formValues.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
      </label>

      <label className="contactFormField">
        <span>
          Subject <span aria-hidden="true">*</span>
        </span>
        <select
          required
          value={formValues.subject}
          onChange={(event) => updateField("subject", event.target.value)}
        >
          <option value="">Select a subject</option>
          {SUPPORT_SUBJECT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="contactFormField">
        <span>
          Message <span aria-hidden="true">*</span>
        </span>
        <textarea
          required
          rows={5}
          value={formValues.message}
          onChange={(event) => updateField("message", event.target.value)}
        />
      </label>

      {submitState === "error" && (
        <p className="contactFormError" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="contactFormLegend">* Required fields</p>

      <button type="submit" className="buttonPrimary" disabled={submitState === "submitting"}>
        {submitState === "submitting" && (
          <Loader2 size={18} strokeWidth={2} className="contactSpinner" aria-hidden="true" />
        )}
        {submitState === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
