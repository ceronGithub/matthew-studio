/**
 * FILE: components/auth/TotpLoginStep.tsx
 * ROLE: Public — rendered inside SignInForm's second step on
 * /auth/login, only after app/api/auth/login/route.ts signals
 * `totpRequired: true`. No session cookies exist yet at this point.
 *
 * PURPOSE:
 * task-47-ui-totp-login-step (part 5 of 6 for 2FA/TOTP,
 * super_admin_account_specification.md Section 12 Phase 1). Collects
 * the 6-digit authenticator code, submits it with the pendingToken to
 * POST /api/auth/totp/verify-login, and hands the granted role back
 * to the parent for the existing role-based redirect. Mirrors the
 * code-input pattern already used by components/admin/TotpEnrollmentForm.tsx
 * (manual useState + validate(), never React Hook Form — this project
 * doesn't use it anywhere).
 *
 * Never reveals whether the token or the code was the actual problem —
 * the message shown is always the server's generic Rule 34.1 string.
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";
import { getCsrfHeader } from "@/lib/csrf";

interface TotpLoginStepProps {
  pendingToken: string;
  showToast: (message: string, type: ToastType) => void;
  onVerified: (role: string) => void;
  onBack: () => void;
}

export default function TotpLoginStep({ pendingToken, showToast, onVerified, onBack }: TotpLoginStepProps) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  function validate(): boolean {
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter the 6-digit code from your authenticator app.");
      return false;
    }
    setCodeError(null);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isVerifying) return;

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/totp/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ pendingToken, code }),
      });
      const result = await response.json();

      if (!result.success) {
        // Inline field error only — never a form-level summary
        // (login_and_registration_page.md Section 3.1, same as the
        // password step in SignInForm).
        setCodeError(result.message ?? "Invalid or expired code. Please try again.");
        return;
      }

      showToast("Signed in. Redirecting…", "success");
      onVerified(result.data?.role);
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="authTotpStep">
      <ShieldCheck size={28} className="authTotpStepIcon" />
      <p className="authFieldHint authTotpStepHint">Enter the 6-digit code from your authenticator app.</p>

      <form onSubmit={handleSubmit} className="authForm" noValidate>
        <div className="authField">
          <label htmlFor="totpLoginCode">Authentication code</label>
          <input
            id="totpLoginCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              if (codeError) setCodeError(null);
            }}
            placeholder="000000"
            className="authTotpCodeInput"
          />
          {codeError && <span className="authFieldError">{codeError}</span>}
        </div>

        <button type="submit" className="authSubmitButton" disabled={isVerifying}>
          {isVerifying ? <Loader2 size={18} className="authSpinner" /> : "Verify"}
        </button>

        <button
          type="button"
          className="authSubmitButton authSubmitButton--link"
          onClick={onBack}
          disabled={isVerifying}
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
}
