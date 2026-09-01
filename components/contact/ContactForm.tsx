/**
 * FILE: components/contact/ContactForm.tsx
 * ROLE: Public — main form on the Contact page (/contact).
 *
 * PURPOSE:
 * Collects name, email, business name, category, tier interest (when
 * relevant), and a message, then POSTs to /api/contact. Pre-selects
 * category from a ?category= query param and tier from ?tier= so a
 * visitor clicking through from /templates or /pricing lands here
 * with their choice already made. The tier field only applies to the
 * Templates category (other categories don't have tiers yet, per
 * improvement_1.md Section 3), so it only renders once Templates is
 * selected. Shows inline success/error feedback and disables the
 * submit button while sending to prevent double-submit.
 */
"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { CATEGORY_OPTIONS, TIER_OPTIONS } from "@/lib/contactData";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const tierFromQuery = searchParams.get("tier") ?? "";
  // A ?tier= link always comes from a Templates CTA, so infer category
  // "templates" in that case even without an explicit ?category= param.
  const categoryFromQuery = searchParams.get("category") ?? (tierFromQuery ? "templates" : "");

  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    businessName: "",
    category: CATEGORY_OPTIONS.some((option) => option.slug === categoryFromQuery)
      ? categoryFromQuery
      : "",
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
      setFormValues({ name: "", email: "", businessName: "", category: "", tier: "", message: "" });
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
          <span>Business / project name</span>
          <input
            type="text"
            value={formValues.businessName}
            onChange={(event) => updateField("businessName", event.target.value)}
          />
        </label>

        <label className="contactFormField">
          <span>Interested in</span>
          <select
            value={formValues.category}
            onChange={(event) => {
              // Switching away from Templates clears any tier already
              // picked — a tier only means something for that category.
              updateField("category", event.target.value);
              if (event.target.value !== "templates") updateField("tier", "");
            }}
          >
            <option value="">Select a category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Tier only applies to Templates — other categories don't have
          tiers yet, so this field only appears once Templates is picked. */}
      {formValues.category === "templates" && (
        <label className="contactFormField">
          <span>Templates tier</span>
          <select value={formValues.tier} onChange={(event) => updateField("tier", event.target.value)}>
            <option value="">Select a tier</option>
            {TIER_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

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
