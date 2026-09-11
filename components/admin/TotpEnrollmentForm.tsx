/**
 * FILE: components/admin/TotpEnrollmentForm.tsx
 * ROLE: Admin/super-admin only — rendered inside
 * app/admin/security/totp-setup/page.tsx, protected by middleware.ts
 * (the existing "/admin/:path*" matcher already covers this nested
 * route — no middleware change needed for this task).
 *
 * PURPOSE:
 * task-47-ui-totp-enrollment (part 4 of 6 for 2FA/TOTP,
 * super_admin_account_specification.md Section 12 Phase 1). Three
 * stages, driven by useTotpEnrollment's status + local enrollment data:
 *   1. Already enabled — nothing to do, shows confirmation + a link back.
 *   2. Not yet enrolled, no QR generated yet — intro + "Generate QR
 *      Code" button.
 *   3. QR generated — shows the QR image + manual-entry secret
 *      fallback, a 6-digit code input, and a Confirm button.
 * Follows the same manual useState + validate() + useToast/ToastStack
 * pattern as components/admin/ProfileForm.tsx (Rule 34.3: autofocus,
 * inline errors, disabled-submit-while-saving) — this project doesn't
 * use React Hook Form anywhere, so this mirrors the established
 * convention rather than introducing a new one.
 *
 * Explicitly out of scope here (per task-47-ui-totp-enrollment.md):
 * the login-time TOTP prompt (task-47-ui-totp-login-step) and the
 * forced-enrollment middleware gate (task-47-totp-setup-gate).
 */
"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, PackageOpen, Copy, CheckCircle2, QrCode } from "lucide-react";
import { useTotpEnrollment, type TotpEnrollmentData } from "@/lib/hooks/useTotpEnrollment";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

const DEFAULT_REDIRECT = "/admin/dashboard";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function TotpEnrollmentForm() {
  const { status, isLoading, error, refetch, generate, verify } = useTotpEnrollment();
  const { toasts, showToast, dismissToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Optional redirect target for when task-47-totp-setup-gate's forced
  // middleware redirect starts sending admins here — falls back to the
  // dashboard when reached voluntarily from account settings, per this
  // task's scope note.
  const redirectTarget = searchParams.get("redirectTo") || DEFAULT_REDIRECT;

  const [isGenerating, setIsGenerating] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<TotpEnrollmentData | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSecretCopied, setIsSecretCopied] = useState(false);
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generate();
    setIsGenerating(false);

    if (!result.success || !result.data) {
      showToast(`✕ ${result.message}`, "error");
      return;
    }
    setEnrollmentData(result.data);
  }

  async function handleCopySecret() {
    if (!enrollmentData) return;
    try {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setIsSecretCopied(true);
      showToast("✓ Secret copied to clipboard.", "success");
      if (copiedResetTimer.current) clearTimeout(copiedResetTimer.current);
      copiedResetTimer.current = setTimeout(() => setIsSecretCopied(false), 2000);
    } catch {
      showToast("✕ Couldn't copy automatically. Please select and copy the code manually.", "error");
    }
  }

  function validateCode(): boolean {
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter the 6-digit code from your authenticator app.");
      return false;
    }
    setCodeError(null);
    return true;
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCode() || isVerifying) return;

    setIsVerifying(true);
    const result = await verify(code);
    setIsVerifying(false);

    if (!result.success) {
      // Inline error per Rule 34.3 — never a modal or alert() for a
      // wrong code.
      setCodeError(result.message);
      return;
    }

    showToast("✓ Two-factor authentication enabled.", "success");
    // Brief pause so the success toast is visible before navigating away.
    setTimeout(() => router.push(redirectTarget), 900);
  }

  // --- Loading state (Rule 25) ---
  if (isLoading) {
    return (
      <div className="totpSetupCard">
        <div className="totpSetupSkeletonQr skeletonBlock" />
        <div className="totpSetupSkeletonLine skeletonBlock" />
        <div className="totpSetupSkeletonLine skeletonBlock totpSetupSkeletonLine--short" />
      </div>
    );
  }

  // --- Error state (Rule 25) ---
  if (error) {
    return (
      <div className="totpSetupEmptyState">
        <PackageOpen size={32} />
        <p>{error}</p>
        <button type="button" className="totpSetupRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  // --- Already enabled — nothing left to enroll ---
  if (status?.enabled) {
    return (
      <div className="totpSetupCard totpSetupAlreadyEnabled">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <ShieldCheck size={40} className="totpSetupAlreadyEnabledIcon" />
        <h2 className="totpSetupSectionTitle">Two-factor authentication is already enabled</h2>
        <p className="totpSetupHint">
          {status.enrolledAt
            ? `Enabled on ${formatDate(status.enrolledAt)}.`
            : "Your account is protected with an authenticator app."}
        </p>
        <button type="button" className="totpSetupSaveButton" onClick={() => router.push(redirectTarget)}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // --- Not yet enrolled: intro screen before a QR has been generated ---
  if (!enrollmentData) {
    return (
      <div className="totpSetupCard">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <QrCode size={40} className="totpSetupIntroIcon" />
        <h2 className="totpSetupSectionTitle">Set up two-factor authentication</h2>
        <p className="totpSetupHint">
          You&apos;ll need an authenticator app (like Google Authenticator or Authy) on your phone. We&apos;ll show
          you a QR code to scan, then ask you to enter a 6-digit code to confirm.
        </p>
        <button type="button" className="totpSetupSaveButton" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 size={16} className="totpSetupSpin" /> Generating…
            </>
          ) : (
            "Generate QR Code"
          )}
        </button>
      </div>
    );
  }

  // --- QR generated: scan + confirm ---
  return (
    <div className="totpSetupCard">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <h2 className="totpSetupSectionTitle">Scan the QR code</h2>
      <p className="totpSetupHint">Open your authenticator app and scan this code, or enter it manually below.</p>

      <div className="totpSetupQrWrapper">
        {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data: URL, next/image has no benefit here */}
        <img src={enrollmentData.qrCodeDataUrl} alt="QR code for authenticator app enrollment" className="totpSetupQrImage" />
      </div>

      <div className="totpSetupSecretRow">
        <span className="totpSetupSecretLabel">Can&apos;t scan? Enter this code manually:</span>
        <div className="totpSetupSecretValueRow">
          <code className="totpSetupSecretCode">{enrollmentData.secret}</code>
          <button
            type="button"
            className="totpSetupCopyButton"
            onClick={handleCopySecret}
            aria-label="Copy secret to clipboard"
          >
            {isSecretCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <form onSubmit={handleVerifySubmit} className="totpSetupForm" noValidate>
        <div className="totpSetupField">
          <label htmlFor="totpSetupCodeInput">6-digit code</label>
          <input
            id="totpSetupCodeInput"
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
          />
          {codeError && <span className="totpSetupFieldError">{codeError}</span>}
        </div>

        <button type="submit" className="totpSetupSaveButton" disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2 size={16} className="totpSetupSpin" /> Verifying…
            </>
          ) : (
            "Confirm"
          )}
        </button>
      </form>
    </div>
  );
}
