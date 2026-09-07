/**
 * FILE: app/auth/forgot-password/page.tsx
 * ROLE: Public — served at "/auth/forgot-password".
 *
 * PURPOSE:
 * Single-page wizard inside the same glass-card-over-slideshow shell
 * as /auth/login. Drives buyer_password_recovery_specification.md
 * Section 4's 3-method forgot-password flow (email / Telegram /
 * security question) via ForgotPasswordWizard — replaces the retired
 * Supabase-native ForgotPasswordForm (task-69).
 */
"use client";

import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AuthBackgroundSlideshow from "@/components/auth/AuthBackgroundSlideshow";
import ForgotPasswordWizard from "@/components/auth/ForgotPasswordWizard";
import "@/app/styles/recoverySetup.css";
import "@/app/styles/forgotPassword.css";

export default function ForgotPasswordPage() {
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <>
      <AuthBackgroundSlideshow />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="authGlassCard">
        <h1 className="authPageHeading">Forgot password?</h1>
        <ForgotPasswordWizard showToast={showToast} />
      </div>
    </>
  );
}
