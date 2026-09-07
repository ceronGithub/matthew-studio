/**
 * FILE: app/auth/register/recovery-setup/page.tsx
 * ROLE: Buyer — served at "/auth/register/recovery-setup", right
 * after registration succeeds.
 *
 * PURPOSE:
 * Hosts RecoverySetupWizard inside the same glass-card-over-slideshow
 * shell as /auth/login and /auth/forgot-password. Not yet enforced
 * as a blocking screen in middleware.ts (Section 2's
 * recoverySetupComplete gate is task-35's other half, alongside
 * Telegram linking) — reachable today only via RegisterForm's
 * post-registration redirect.
 */
"use client";

import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AuthBackgroundSlideshow from "@/components/auth/AuthBackgroundSlideshow";
import RecoverySetupWizard from "@/components/auth/RecoverySetupWizard";
import "@/app/styles/recoverySetup.css";

export default function RecoverySetupPage() {
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <>
      <AuthBackgroundSlideshow />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="authGlassCard">
        <h1 className="authPageHeading">Secure your account</h1>
        <RecoverySetupWizard showToast={showToast} />
      </div>
    </>
  );
}
