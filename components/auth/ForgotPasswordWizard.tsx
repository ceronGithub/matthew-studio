/**
 * FILE: components/auth/ForgotPasswordWizard.tsx
 * ROLE: Public — rendered on /auth/forgot-password (replaces the
 * retired Supabase-native ForgotPasswordForm).
 *
 * PURPOSE:
 * buyer_password_recovery_specification.md Section 4's forgot-password
 * flow — the 3-method system built server-side in task-66/67/68
 * (BuyerRecovery-based: email OTP, Telegram OTP, security question).
 * This is task-69: the UI that drives /api/auth/forgot-password's
 * initiate/verify endpoints end to end.
 *
 * DATA FLOW:
 * 1. Step "identify": POST .../initiate { email } — always succeeds
 *    with the same shape (Section 4.1/4.2 anti-enumeration), returning
 *    the 3 fixed method cards plus a question preview (real or
 *    generic — indistinguishable to the buyer either way).
 * 2. Step "method": buyer picks one card. Email/Telegram immediately
 *    fire POST .../verify { action: "send" } and advance to "verify".
 *    Security Question skips the send step and advances directly.
 * 3. Step "verify": OTP input (email/telegram, with a 60s local
 *    resend cooldown — the API's "send" response is intentionally
 *    generic and carries no server-issued cooldown, unlike
 *    recovery-setup/email) or answer input (security question). POST
 *    .../verify { action: "verify" } returns a one-time resetToken.
 * 4. Step "done": hands the resetToken to /auth/reset-password via a
 *    query param. NOTE: /auth/reset-password still runs the legacy
 *    Supabase session-based ResetPasswordForm as of this task —
 *    task-70 is what teaches that page to consume ?token=. Until
 *    task-70 ships, this final link is a placeholder destination,
 *    not a working handoff — flagged in the task-69 doc, not solved
 *    silently here.
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Check, Mail, Send, KeyRound } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";
import { getCsrfHeader } from "@/lib/csrf";

type WizardStep = "identify" | "method" | "verify" | "done";
type Method = "email" | "telegram" | "security_question";

interface ForgotPasswordWizardProps {
  showToast: (message: string, type: ToastType) => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordWizard({ showToast }: ForgotPasswordWizardProps) {
  const [step, setStep] = useState<WizardStep>("identify");

  // --- Identify step state ---
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isIdentifying, setIsIdentifying] = useState(false);

  // --- Method step state ---
  const [questionText, setQuestionText] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // --- Verify step state ---
  const [otpCode, setOtpCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [verifyError, setVerifyError] = useState<string | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // --- Done step state ---
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Ticks the resend cooldown down once per second — same pattern as
  // RecoverySetupWizard.tsx, kept local since /verify's "send" action
  // never returns a server-issued retryAfterSeconds.
  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function handleIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isIdentifying) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(undefined);
    setIsIdentifying(true);

    try {
      const response = await fetch("/api/auth/forgot-password/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Something went wrong. Please try again.", "error");
        return;
      }

      setQuestionText(result.data?.questionText ?? "");
      setStep("method");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsIdentifying(false);
    }
  }

  // Fires the OTP send for email/telegram, then advances regardless
  // of the (always-generic) result — Section 4.1/4.2 anti-enumeration
  // means there's nothing meaningful to branch on here.
  async function sendCode(method: "email" | "telegram") {
    setIsSendingCode(true);
    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ email: email.trim(), method, action: "send" }),
      });
      const result = await response.json();
      if (!result.success) {
        showToast(result.message ?? "Too many attempts. Please try again in 15 minutes.", "error");
        return false;
      }
      return true;
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
      return false;
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleSelectMethod(method: Method) {
    setSelectedMethod(method);
    setOtpCode("");
    setAnswer("");
    setVerifyError(undefined);

    if (method === "security_question") {
      setStep("verify");
      return;
    }

    const sent = await sendCode(method);
    if (sent) {
      startCooldown();
      showToast(
        method === "email" ? "✓ If eligible, a code was sent to your email." : "✓ If eligible, a code was sent via Telegram.",
        "success"
      );
      setStep("verify");
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isSendingCode || selectedMethod === "security_question" || !selectedMethod) return;
    const sent = await sendCode(selectedMethod);
    if (sent) {
      startCooldown();
      showToast("✓ Code resent.", "success");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isVerifying || !selectedMethod) return;

    const isSecurityQuestion = selectedMethod === "security_question";
    if (isSecurityQuestion && answer.trim().length < 1) {
      setVerifyError("Enter your answer.");
      return;
    }
    if (!isSecurityQuestion && otpCode.trim().length !== 6) {
      setVerifyError("Enter the 6-digit code.");
      return;
    }
    setVerifyError(undefined);
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({
          email: email.trim(),
          method: selectedMethod,
          action: "verify",
          ...(isSecurityQuestion ? { answer: answer.trim() } : { otp: otpCode.trim() }),
        }),
      });
      const result = await response.json();

      if (!result.success) {
        setVerifyError(result.message ?? "Verification failed. Please try again.");
        return;
      }

      setResetToken(result.data?.resetToken ?? null);
      showToast("✓ Identity verified.", "success");
      setStep("done");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsVerifying(false);
    }
  }

  function stepState(target: WizardStep): "pending" | "active" | "done" {
    const order: WizardStep[] = ["identify", "method", "verify", "done"];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(target);
    if (targetIndex < currentIndex) return "done";
    if (targetIndex === currentIndex) return "active";
    return "pending";
  }

  return (
    <>
      <div className="recoverySetupSteps">
        <StepDot label="Identify" state={stepState("identify")} />
        <div className="recoverySetupStepDivider" />
        <StepDot label="Choose method" state={stepState("method")} />
        <div className="recoverySetupStepDivider" />
        <StepDot label="Verify" state={stepState("verify")} />
      </div>

      {step === "identify" && (
        <form onSubmit={handleIdentify} className="authForm" noValidate>
          <p className="authPageDescription">
            Enter the email on your account and we&apos;ll show you the ways you can verify it&apos;s you.
          </p>

          <div className="authField">
            <label htmlFor="forgotPasswordEmail">Email</label>
            <input
              id="forgotPasswordEmail"
              type="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            {emailError && <span className="authFieldError">{emailError}</span>}
          </div>

          <button type="submit" className="authSubmitButton" disabled={isIdentifying}>
            {isIdentifying ? <Loader2 size={18} className="authSpinner" /> : "Continue"}
          </button>
        </form>
      )}

      {step === "method" && (
        <div className="authForm">
          <p className="authPageDescription">Choose how you&apos;d like to verify it&apos;s you.</p>

          <div className="forgotPasswordMethodList">
            <MethodCard
              icon={<Mail size={18} />}
              title="Email"
              description="Get a 6-digit code by email."
              disabled={isSendingCode}
              onClick={() => handleSelectMethod("email")}
            />
            <MethodCard
              icon={<Send size={18} />}
              title="Telegram"
              description="Get a 6-digit code via your linked Telegram."
              disabled={isSendingCode}
              onClick={() => handleSelectMethod("telegram")}
            />
            <MethodCard
              icon={<KeyRound size={18} />}
              title="Security question"
              description={questionText}
              disabled={isSendingCode}
              onClick={() => handleSelectMethod("security_question")}
            />
          </div>

          {isSendingCode && (
            <div className="recoverySetupOtpRow">
              <Loader2 size={18} className="authSpinner" />
            </div>
          )}
        </div>
      )}

      {step === "verify" && selectedMethod && (
        <form onSubmit={handleVerify} className="authForm" noValidate>
          {selectedMethod === "security_question" ? (
            <>
              <p className="authPageDescription">{questionText}</p>
              <div className="authField">
                <label htmlFor="forgotPasswordAnswer">Answer</label>
                <input
                  id="forgotPasswordAnswer"
                  type="text"
                  autoFocus
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Your answer"
                />
                {verifyError && <span className="authFieldError">{verifyError}</span>}
              </div>
            </>
          ) : (
            <>
              <p className="authPageDescription">
                Enter the 6-digit code we sent {selectedMethod === "email" ? "to your email" : "via Telegram"}.
              </p>
              <div className="authField">
                <label htmlFor="forgotPasswordOtp">6-digit code</label>
                <input
                  id="forgotPasswordOtp"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
                {verifyError && <span className="authFieldError">{verifyError}</span>}
              </div>

              <div className="recoverySetupOtpRow">
                <button
                  type="button"
                  className="recoverySetupResendLink"
                  disabled={resendCooldown > 0 || isSendingCode}
                  onClick={handleResend}
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
              </div>
            </>
          )}

          <button type="submit" className="authSubmitButton" disabled={isVerifying}>
            {isVerifying ? <Loader2 size={18} className="authSpinner" /> : "Verify"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="authForm">
          <p className="authPageDescription">Identity verified. You can now set a new password.</p>
          <a
            href={resetToken ? `/auth/reset-password?token=${encodeURIComponent(resetToken)}` : "/auth/reset-password"}
            className="authSubmitButton authSubmitButton--link"
          >
            Continue to reset password
          </a>
        </div>
      )}
    </>
  );
}

function MethodCard({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="forgotPasswordMethodCard" disabled={disabled} onClick={onClick}>
      <span className="forgotPasswordMethodIcon">{icon}</span>
      <span className="forgotPasswordMethodText">
        <span className="forgotPasswordMethodTitle">{title}</span>
        <span className="forgotPasswordMethodDescription">{description}</span>
      </span>
    </button>
  );
}

function StepDot({ label, state }: { label: string; state: "pending" | "active" | "done" }) {
  return (
    <div className={`recoverySetupStep recoverySetupStep--${state}`}>
      <span className="recoverySetupStepDot">{state === "done" ? <Check size={12} /> : ""}</span>
      <span>{label}</span>
    </div>
  );
}
