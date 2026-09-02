/**
 * FILE: components/auth/SignInForm.tsx
 * ROLE: Auth — Sign In tab inside the glass card on /auth/login.
 *
 * PURPOSE:
 * Collects email + password, calls POST /api/auth/login, and routes
 * the buyer to their dashboard on success. Field-level errors only —
 * no form-level error summary, per login_and_registration_page.md
 * Section 3.1.
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";
import { getCsrfHeader } from "@/lib/csrf";
import { getDashboardPathForRole } from "@/lib/roleRouting";

interface SignInFormProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function SignInForm({ showToast }: SignInFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length === 0) {
      errors.password = "Enter your password.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Invalid email or password.", "error");
        return;
      }

      showToast("Signed in. Redirecting…", "success");
      router.push(getDashboardPathForRole(result.data?.role));
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="authForm" noValidate>
      <div className="authField">
        <label htmlFor="signInEmail">Email</label>
        <input
          id="signInEmail"
          type="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@studio.com"
        />
        {fieldErrors.email && <span className="authFieldError">{fieldErrors.email}</span>}
      </div>

      <div className="authField">
        <label htmlFor="signInPassword">Password</label>
        <div className="authPasswordWrapper">
          <input
            id="signInPassword"
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
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
        {fieldErrors.password && <span className="authFieldError">{fieldErrors.password}</span>}
      </div>

      <a href="/auth/forgot-password" className="authForgotLink">
        Forgot password?
      </a>

      <button type="submit" className="authSubmitButton" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={18} className="authSpinner" /> : "Sign in"}
      </button>
    </form>
  );
}
