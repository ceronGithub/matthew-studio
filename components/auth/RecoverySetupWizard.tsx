/**
 * FILE: components/auth/RecoverySetupWizard.tsx
 * ROLE: Auth — rendered on /auth/register/recovery-setup.
 *
 * PURPOSE:
 * buyer_password_recovery_specification.md Section 2's mandatory
 * post-registration recovery setup. This wizard currently implements
 * two of the three steps: Email OTP (2.1) and Security Question
 * (2.3). Telegram linking (2.2) and the final
 * recoverySetupComplete=true flip (2.4) are a separate, not-yet-built
 * piece (task-35's remainder — needs TELEGRAM_BOT_TOKEN wiring +
 * middleware.ts gate) — deliberately left out of the step indicator's
 * total count comment below rather than shown as a broken third step.
 *
 * DATA FLOW:
 * 1. On mount: nothing auto-sent — buyer taps "Send code" themselves
 *    (matches the Resend cooldown UX better than an invisible
 *    auto-send on page load).
 * 2. Step "email": POST /api/auth/recovery-setup/email — action
 *    "send" then "verify". On success, advance to "security-question".
 * 3. Step "security-question": POST
 *    /api/auth/recovery-setup/security-question. On success, advance
 *    to "done".
 * 4. Step "done": interim screen — explains Telegram linking is
 *    coming, offers a manual continue link (no middleware gate exists
 *    yet to block this, since that's the remaining half of task-35).
 */
"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";
import { getCsrfHeader } from "@/lib/csrf";
import { SECURITY_QUESTION_BANK } from "@/lib/securityQuestions";

type WizardStep = "email" | "security-question" | "done";

interface RecoverySetupWizardProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function RecoverySetupWizard({ showToast }: RecoverySetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("email");

  // --- Email OTP step state ---
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | undefined>();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // --- Security question step state ---
  const [questionId, setQuestionId] = useState(SECURITY_QUESTION_BANK[0].id);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | undefined>();
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Ticks the resend cooldown down once per second while active.
  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
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

  async function handleSendOtp() {
    if (isSendingOtp || resendCooldown > 0) return;
    setIsSendingOtp(true);
    setOtpError(undefined);
    try {
      const response = await fetch("/api/auth/recovery-setup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "send" }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't send code. Please try again.", "error");
        if (result.data?.retryAfterSeconds) startCooldown(result.data.retryAfterSeconds);
        return;
      }

      setOtpSent(true);
      startCooldown(60);
      showToast("✓ Code sent to your email.", "success");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isVerifyingOtp) return;

    if (otpCode.trim().length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpError(undefined);
    setIsVerifyingOtp(true);

    try {
      const response = await fetch("/api/auth/recovery-setup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "verify", code: otpCode.trim() }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Incorrect code. Please try again.", "error");
        return;
      }

      showToast("✓ Email verified successfully.", "success");
      setStep("security-question");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleSaveSecurityQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingQuestion) return;

    if (answer.trim().length < 2) {
      setAnswerError("Your answer must be at least 2 characters.");
      return;
    }
    setAnswerError(undefined);
    setIsSavingQuestion(true);

    try {
      const response = await fetch("/api/auth/recovery-setup/security-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ questionId, answer: answer.trim() }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't save. Please try again.", "error");
        return;
      }

      showToast("✓ Security question saved.", "success");
      setStep("done");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSavingQuestion(false);
    }
  }

  return (
    <>
      {/* Step indicator — 2 of the 3 spec steps are live here; Telegram
          linking is the remaining piece (task-35's other half). */}
      <div className="recoverySetupSteps">
        <StepDot label="Email" state={step === "email" ? "active" : "done"} />
        <div className="recoverySetupStepDivider" />
        <StepDot
          label="Security question"
          state={step === "security-question" ? "active" : step === "done" ? "done" : "pending"}
        />
      </div>

      {step === "email" && (
        <form onSubmit={handleVerifyOtp} className="authForm" noValidate>
          <p className="authPageDescription">
            We&apos;ll send a 6-digit code to your registered email to confirm you control that inbox.
          </p>

          {!otpSent ? (
            <button
              type="button"
              className="authSubmitButton"
              disabled={isSendingOtp}
              onClick={handleSendOtp}
            >
              {isSendingOtp ? <Loader2 size={18} className="authSpinner" /> : "Send code"}
            </button>
          ) : (
            <>
              <div className="authField">
                <label htmlFor="recoveryEmailOtp">6-digit code</label>
                <input
                  id="recoveryEmailOtp"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
                {otpError && <span className="authFieldError">{otpError}</span>}
              </div>

              <div className="recoverySetupOtpRow">
                <button
                  type="button"
                  className="recoverySetupResendLink"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleSendOtp}
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
              </div>

              <button type="submit" className="authSubmitButton" disabled={isVerifyingOtp}>
                {isVerifyingOtp ? <Loader2 size={18} className="authSpinner" /> : "Verify email"}
              </button>
            </>
          )}
        </form>
      )}

      {step === "security-question" && (
        <form onSubmit={handleSaveSecurityQuestion} className="authForm" noValidate>
          <p className="authPageDescription">
            Pick a question and answer only you would know — a third way back into your account if
            email and Telegram aren&apos;t available later.
          </p>

          <div className="authField">
            <label htmlFor="recoverySecurityQuestion">Security question</label>
            <select
              id="recoverySecurityQuestion"
              value={questionId}
              onChange={(event) => setQuestionId(event.target.value)}
            >
              {SECURITY_QUESTION_BANK.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.text}
                </option>
              ))}
            </select>
          </div>

          <div className="authField">
            <label htmlFor="recoverySecurityAnswer">Answer</label>
            <input
              id="recoverySecurityAnswer"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Your answer"
            />
            {answerError && <span className="authFieldError">{answerError}</span>}
          </div>

          <p className="recoverySetupHelperText">
            Choose a question only you would know the answer to — not something a friend or social
            media could guess.
          </p>

          <button type="submit" className="authSubmitButton" disabled={isSavingQuestion}>
            {isSavingQuestion ? <Loader2 size={18} className="authSpinner" /> : "Save and continue"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="authForm">
          <p className="authPageDescription">
            Email and security question are set up. Telegram linking (the third recovery method)
            is coming soon — you can continue to your dashboard for now.
          </p>
          <a href="/buyer/dashboard" className="authSubmitButton authSubmitButton--link">
            Continue to dashboard
          </a>
        </div>
      )}
    </>
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
