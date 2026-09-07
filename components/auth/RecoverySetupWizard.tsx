/**
 * FILE: components/auth/RecoverySetupWizard.tsx
 * ROLE: Auth — rendered on /auth/register/recovery-setup.
 *
 * PURPOSE:
 * buyer_password_recovery_specification.md Section 2's mandatory
 * post-registration recovery setup. All three steps are now live:
 * Email OTP (2.1), Telegram linking (2.2), Security Question (2.3).
 * The final recoverySetupComplete=true flip and the middleware.ts
 * blocking gate (2.4) are task-41, the last remaining piece of
 * task-35 — deliberately not flipped here, since flipping it after
 * only these three steps but before the gate exists would let the
 * flag say "complete" while nothing actually enforces it yet.
 *
 * DATA FLOW:
 * 1. Step "email": POST /api/auth/recovery-setup/email — action
 *    "send" then "verify". On success, advance to "telegram".
 * 2. Step "telegram": on entering the step, POST .../telegram/link
 *    { action: "start" } to get a deep link + begin polling
 *    { action: "status" } every 3s. A buyer who opened the bot
 *    without the deep link instead types the 6-digit code the bot
 *    DMed them into the manual-fallback field, which calls
 *    { action: "verify-code" }. Either path advances to
 *    "security-question" once telegramLinked is true.
 * 3. Step "security-question": POST
 *    /api/auth/recovery-setup/security-question. On success, advance
 *    to "done".
 * 4. Step "done": interim screen — explains the dashboard gate is
 *    coming, offers a manual continue link (no middleware gate exists
 *    yet to block this — that's task-41).
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import type { ToastType } from "@/components/shared/useToast";
import { getCsrfHeader } from "@/lib/csrf";
import { SECURITY_QUESTION_BANK } from "@/lib/securityQuestions";

type WizardStep = "email" | "telegram" | "security-question" | "done";

interface RecoverySetupWizardProps {
  showToast: (message: string, type: ToastType) => void;
}

const TELEGRAM_STATUS_POLL_INTERVAL_MS = 3000;

export default function RecoverySetupWizard({ showToast }: RecoverySetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("email");

  // --- Email OTP step state ---
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | undefined>();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // --- Telegram step state ---
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [botConfigured, setBotConfigured] = useState(true);
  const [isStartingLink, setIsStartingLink] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualCodeError, setManualCodeError] = useState<string | undefined>();
  const [isVerifyingManualCode, setIsVerifyingManualCode] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setStep("telegram");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  // Requests a fresh deep link and begins polling for the webhook to
  // mark this buyer as linked. Runs once on entering the "telegram"
  // step (see the useEffect below) — this is a data fetch to prepare
  // state the step needs to render, not a side effect reacting to a
  // user action, so it belongs here rather than behind a button.
  async function startTelegramLink() {
    setIsStartingLink(true);
    try {
      const response = await fetch("/api/auth/recovery-setup/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "start" }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't set up Telegram linking. Please try again.", "error");
        return;
      }

      setBotConfigured(Boolean(result.data?.botConfigured));
      setDeepLink(result.data?.deepLink ?? null);
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsStartingLink(false);
    }
  }

  async function pollTelegramStatus() {
    try {
      const response = await fetch("/api/auth/recovery-setup/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "status" }),
      });
      const result = await response.json();
      if (result.success && result.data?.telegramLinked) {
        setTelegramLinked(true);
      }
    } catch {
      // Silent — this is a background poll; a transient network blip
      // here shouldn't interrupt the buyer or show an error toast.
    }
  }

  // Starts the deep link + polling once, when the buyer reaches the
  // Telegram step — mirrors the email step's "fetch what this step
  // needs to render" pattern, just automatic instead of a button tap
  // (there's no equivalent "Send code" action to gate it behind here).
  useEffect(() => {
    if (step !== "telegram") return;

    startTelegramLink();
    pollIntervalRef.current = setInterval(pollTelegramStatus, TELEGRAM_STATUS_POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Once the poll (or the manual-code path below) confirms linking,
  // stop polling and advance — separate effect so both paths share
  // one exit point instead of duplicating the transition logic.
  useEffect(() => {
    if (!telegramLinked) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    showToast("✓ Telegram linked successfully.", "success");
    setStep("security-question");
  }, [telegramLinked, showToast]);

  async function handleVerifyManualCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isVerifyingManualCode) return;

    if (manualCode.trim().length !== 6) {
      setManualCodeError("Enter the 6-digit code the bot sent you.");
      return;
    }
    setManualCodeError(undefined);
    setIsVerifyingManualCode(true);

    try {
      const response = await fetch("/api/auth/recovery-setup/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "verify-code", code: manualCode.trim() }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Incorrect or expired code. Please try again.", "error");
        return;
      }

      setTelegramLinked(true);
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsVerifyingManualCode(false);
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

  function stepState(target: WizardStep): "pending" | "active" | "done" {
    const order: WizardStep[] = ["email", "telegram", "security-question", "done"];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(target);
    if (targetIndex < currentIndex) return "done";
    if (targetIndex === currentIndex) return "active";
    return "pending";
  }

  return (
    <>
      <div className="recoverySetupSteps">
        <StepDot label="Email" state={stepState("email")} />
        <div className="recoverySetupStepDivider" />
        <StepDot label="Telegram" state={stepState("telegram")} />
        <div className="recoverySetupStepDivider" />
        <StepDot label="Security question" state={stepState("security-question")} />
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

      {step === "telegram" && (
        <div className="authForm">
          <p className="authPageDescription">
            Link your Telegram account — the fastest way back in if you ever lose access, since it
            doesn&apos;t depend on remembering anything.
          </p>

          {!botConfigured && !isStartingLink && (
            <p className="authFieldError">
              Telegram linking isn&apos;t available yet. Please continue and finish this step later
              from your account settings.
            </p>
          )}

          <ol className="recoverySetupTelegramSteps">
            <li>Open Telegram on any device (phone, tablet, or web.telegram.org)</li>
            <li>
              Search for the bot — or tap the button below to open it directly
            </li>
            <li>Tap &quot;Start&quot; (or send /start) in the chat with the bot</li>
            <li>The bot will reply with a 6-digit code</li>
            <li>Copy that code and paste it into the field below</li>
          </ol>

          {isStartingLink ? (
            <div className="recoverySetupOtpRow">
              <Loader2 size={18} className="authSpinner" />
            </div>
          ) : (
            deepLink && (
              <a href={deepLink} target="_blank" rel="noopener noreferrer" className="authSubmitButton">
                Open Telegram
              </a>
            )
          )}

          <p className="recoverySetupHelperText">
            Already tapped the button? This page updates automatically once linking completes — no
            need to refresh.
          </p>

          <form onSubmit={handleVerifyManualCode} className="authForm" noValidate>
            <div className="authField">
              <label htmlFor="recoveryTelegramCode">6-digit code (if you opened Telegram manually)</label>
              <input
                id="recoveryTelegramCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              {manualCodeError && <span className="authFieldError">{manualCodeError}</span>}
            </div>

            <button type="submit" className="authSubmitButton" disabled={isVerifyingManualCode}>
              {isVerifyingManualCode ? <Loader2 size={18} className="authSpinner" /> : "Verify & link"}
            </button>
          </form>
        </div>
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
            All three recovery methods are set up. You can continue to your dashboard now.
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
