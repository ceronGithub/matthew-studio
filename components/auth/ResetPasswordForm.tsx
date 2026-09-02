/**
 * FILE: components/auth/ResetPasswordForm.tsx
 * ROLE: Auth — form rendered on /auth/reset-password.
 *
 * PURPOSE:
 * Sets a new password for the account that requested a reset. Supabase's
 * browser SDK detects the recovery token in the URL fragment on page
 * load (detectSessionInUrl, on by default) and establishes a temporary
 * session for exactly this purpose — so the actual update goes straight
 * through supabaseBrowserClient.auth.updateUser(), not our own API.
 * A background call to /api/auth/reset-password only records the
 * event to SecurityLog; it never gates the password change itself.
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/authData";
import { supabaseBrowserClient } from "@/lib/supabase/browserClient";
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

  // "checking" until we confirm Supabase actually attached a recovery
  // session from the link — "invalid" means the link is missing, used,
  // or expired, and the form is replaced with a message instead.
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Give the SDK a moment to parse the URL fragment and set the
    // session before checking — it runs synchronously on client init,
    // but getSession() still confirms it landed correctly.
    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      setSessionState(data.session ? "valid" : "invalid");
    });
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!isPasswordStrongEnough(password)) errors.password = PASSWORD_REQUIREMENTS_HINT;
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabaseBrowserClient.auth.updateUser({ password });

      if (error) {
        showToast(error.message || "Could not reset your password. Please request a new link.", "error");
        return;
      }

      // Fire-and-forget — this only records the event for security
      // visibility, it never blocks the redirect below.
      fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.user?.email ?? "" }),
      }).catch(() => {});

      showToast("Password updated. Signing you in…", "success");
      router.push("/buyer/dashboard");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sessionState === "checking") {
    return (
      <div className="authForm">
        <p className="authPageDescription">Verifying your reset link…</p>
      </div>
    );
  }

  if (sessionState === "invalid") {
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
        {fieldErrors.confirmPassword && <span className="authFieldError">{fieldErrors.confirmPassword}</span>}
      </div>

      <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="authSpinner" /> : "Reset password"}
      </button>
    </form>
  );
}
