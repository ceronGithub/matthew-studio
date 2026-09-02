/**
 * FILE: components/auth/ForgotPasswordForm.tsx
 * ROLE: Auth — form rendered on /auth/forgot-password.
 *
 * PURPOSE:
 * Collects an email address and requests a Supabase password-reset
 * link. Always shows the same generic confirmation regardless of
 * whether the account exists — the API response is generic by design
 * (enumeration prevention), so the UI never branches on "found" vs
 * "not found" either.
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";

interface ForgotPasswordFormProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function ForgotPasswordForm({ showToast }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function validate(): boolean {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldError(isValidEmail ? undefined : "Enter a valid email address.");
    return isValidEmail;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (response.status === 429) {
        showToast(result.message ?? "Too many attempts. Please try again in 15 minutes.", "error");
        return;
      }

      // Generic confirmation either way — never tell the user whether
      // the email was actually found (prevents account enumeration).
      setHasSubmitted(true);
      showToast("Check your email for a reset link.", "success");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hasSubmitted) {
    return (
      <div className="authForm">
        <p className="authPageDescription">
          If <strong>{email}</strong> is registered, a password reset link is on its way. Check your inbox
          (and spam folder) — the link expires after a short while.
        </p>
        <a href="/auth/login" className="authSubmitButton authSubmitButton--link">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="authForm" noValidate>
      <p className="authPageDescription">
        Enter the email on your account and we&apos;ll send you a link to reset your password.
      </p>

      <div className="authField">
        <label htmlFor="forgotPasswordEmail">Email</label>
        <input
          id="forgotPasswordEmail"
          type="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@studio.com"
        />
        {fieldError && <span className="authFieldError">{fieldError}</span>}
      </div>

      <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="authSpinner" /> : "Send reset link"}
      </button>

      <p className="authSwitchPrompt">
        Remembered it?{" "}
        <a href="/auth/login">Back to sign in</a>
      </p>
    </form>
  );
}
