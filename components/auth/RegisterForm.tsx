/**
 * FILE: components/auth/RegisterForm.tsx
 * ROLE: Auth — Create Account tab inside the glass card on /auth/login.
 *
 * PURPOSE:
 * Collects full name, email, password, confirm password, and terms
 * acceptance, then POSTs to /api/auth/register. All new accounts are
 * created as role "buyer" — the API route is the actual enforcement
 * point (Section 13 of login_and_registration_page.md); this form
 * never sends a role field.
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/authData";
import type { ToastType } from "@/components/shared/useToast";

interface RegisterFormProps {
  showToast: (message: string, type: ToastType) => void;
}

// Strips the characters forbidden across all user-facing text inputs
// (Rule 18.1) — first line of defense against injection in the name field.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function RegisterForm({ showToast }: RegisterFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
    if (!isPasswordStrongEnough(password)) errors.password = PASSWORD_REQUIREMENTS_HINT;
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    if (!acceptedTerms) errors.terms = "You need to accept the Terms of Service.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim().replace(FORBIDDEN_CHARACTERS, ""),
          email,
          password,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't create account. Please try again.", "error");
        return;
      }

      showToast("Account created! Welcome to Matthew Studio.", "success");
      router.push("/buyer/dashboard");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="authForm" noValidate>
      <div className="authField">
        <label htmlFor="registerFullName">Full name</label>
        <input
          id="registerFullName"
          type="text"
          autoFocus
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Jane Dela Cruz"
        />
        {fieldErrors.fullName && <span className="authFieldError">{fieldErrors.fullName}</span>}
      </div>

      <div className="authField">
        <label htmlFor="registerEmail">Email</label>
        <input
          id="registerEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@studio.com"
        />
        {fieldErrors.email && <span className="authFieldError">{fieldErrors.email}</span>}
      </div>

      <div className="authField">
        <label htmlFor="registerPassword">Password</label>
        <div className="authPasswordWrapper">
          <input
            id="registerPassword"
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
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
        <label htmlFor="registerConfirmPassword">Confirm password</label>
        <input
          id="registerConfirmPassword"
          type={isPasswordVisible ? "text" : "password"}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter password"
        />
        {fieldErrors.confirmPassword && <span className="authFieldError">{fieldErrors.confirmPassword}</span>}
      </div>

      <label className="authTermsCheckbox">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        <span>
          I agree to the <a href="/terms">Terms of Service</a>
        </span>
      </label>
      {fieldErrors.terms && <span className="authFieldError">{fieldErrors.terms}</span>}

      <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="authSpinner" /> : "Create account"}
      </button>
    </form>
  );
}
