/**
 * FILE: components/auth/ResetPasswordForm.tsx
 * ROLE: Auth — form rendered on /auth/reset-password.
 *
 * PURPOSE:
 * Sets a new password using the single-use `resetToken` minted by
 * /api/auth/forgot-password/verify (task-67) and consumed by
 * /api/auth/forgot-password/reset (task-68). Replaces the legacy
 * Supabase-session-based version — the token now arrives as a
 * `?token=` query param on the link sent by the new forgot-password
 * wizard (task-69), not as a URL fragment Supabase's SDK auto-detects.
 * Task-70 (this file) closes buyer_password_recovery_specification.md
 * end to end (Section 8 of docs/taskPlan.md).
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/authData";
import { getCsrfHeader } from "@/lib/csrf";
import type { ToastType } from "@/components/shared/useToast";

interface ResetPasswordFormProps {
  showToast: (message: string, type: ToastType) => void;
}

function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function ResetPasswordForm({ showToast }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Flips true only after the server itself rejects the token
  // (invalid/expired/already-used) — a missing token in the URL is
  // treated the same way, without a round trip.
  const [tokenRejected, setTokenRejected] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!isPasswordStrongEnough(password)) errors.password = PASSWORD_REQUIREMENTS_HINT;
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetToken || !validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ resetToken, newPassword: password }),
      });
      const result = await response.json();

      if (!result.success) {
        // The reset route returns one generic message for any
        // invalid/expired/already-used token (Rule 32.4's spirit —
        // no need to distinguish which, per task-68's own note).
        // Swap to the "request a new link" state instead of just
        // toasting, since retrying the same submit can never work.
        setTokenRejected(true);
        showToast(result.message || "This reset link is invalid or has expired.", "error");
        return;
      }

      // Rule 44 already terminated any live session server-side
      // (task-68) — this flow never had one to begin with in the
      // typical case (buyer arrived via an emailed/Telegrammed link,
      // not a logged-in tab), so send them to log in fresh rather
      // than assuming a dashboard redirect.
      showToast("Password updated. Please log in with your new password.", "success");
      router.push("/auth/login");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!resetToken || tokenRejected) {
    return (
      <div className="authForm">
        <p className="authPageDescription">
          This reset link is invalid or has expired. Request a new one to continue.
        </p>
        <a href="/auth/forgot-password" className="authSubmitButton authSubmitButton--link">
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="authForm" noValidate>
      <p className="authPageDescription">Choose a new password for your account.</p>

      <div className="authField">
        <label htmlFor="resetPassword">New password</label>
        <div className="authPasswordWrapper">
          <input
            id="resetPassword"
            type={isPasswordVisible ? "text" : "password"}
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a new password"
          />
          <button
            type="button"
            className="authPasswordToggle"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
        {fieldErrors.password && <span className="authFieldError">{fieldErrors.password}</span>}
      </div>

      <div className="authField">
        <label htmlFor="resetConfirmPassword">Confirm new password</label>
        <input
          id="resetConfirmPassword"
          type={isPasswordVisible ? "text" : "password"}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter new password"
        />
        {fieldErrors.confirmPassword && (
          <span className="authFieldError">{fieldErrors.confirmPassword}</span>
        )}
      </div>

      <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="authSpinner" /> : "Reset password"}
      </button>
    </form>
  );
}
