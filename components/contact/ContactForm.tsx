/**
 * FILE: components/contact/ContactForm.tsx
 * ROLE: Public — main form on the Contact page (/contact).
 *
 * PURPOSE:
 * Collects name, email, resort/business name, tier interest, and a
 * message, then POSTs to /api/contact. Pre-selects the tier dropdown
 * from a ?tier= query param so a visitor clicking "Get Started" on
 * /shop lands here with their tier already chosen. Shows inline
 * success/error feedback and disables the submit button while
 * sending to prevent double-submit.
 */
"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { TIER_OPTIONS } from "@/lib/contactData";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const tierFromQuery = searchParams.get("tier") ?? "";

  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    resortName: "",
    tier: TIER_OPTIONS.some((option) => option.slug === tierFromQuery) ? tierFromQuery : "",
    message: "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof typeof formValues, value: string) {
    setFormValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Frontend guard — the API route re-validates server-side regardless
    if (!formValues.name.trim() || !formValues.email.trim() || !formValues.message.trim()) {
      setSubmitState("error");
      setErrorMessage("Please fill in your name, email, and message.");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
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
      setFormValues({ name: "", email: "", resortName: "", tier: "", message: "" });
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
    <form className="contactForm" onSubmit={handleSubmit} noValidate>
      <div className="contactFormRow">
        <label className="contactFormField">
          <span>
            Name <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            autoFocus
            required
            value={formValues.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <label className="contactFormField">
          <span>
            Email <span aria-hidden="true">*</span>
          </span>
          <input
            type="email"
            required
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </label>
      </div>

      <div className="contactFormRow">
        <label className="contactFormField">
          <span>Resort / business name</span>
          <input
            type="text"
            value={formValues.resortName}
            onChange={(event) => updateField("resortName", event.target.value)}
          />
        </label>

        <label className="contactFormField">
          <span>Interested in</span>
          <select value={formValues.tier} onChange={(event) => updateField("tier", event.target.value)}>
            <option value="">Select a tier</option>
            {TIER_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
