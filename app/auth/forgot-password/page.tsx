/**
 * FILE: app/auth/forgot-password/page.tsx
 * ROLE: Public — served at "/auth/forgot-password".
 *
 * PURPOSE:
 * Single-form page (no tabs) inside the same glass-card-over-slideshow
 * shell as /auth/login. Collects an email and requests a Supabase
 * password-reset link via ForgotPasswordForm.
 */
"use client";

import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AuthBackgroundSlideshow from "@/components/auth/AuthBackgroundSlideshow";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <>
      <AuthBackgroundSlideshow />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="authGlassCard">
        <h1 className="authPageHeading">Forgot password?</h1>
        <ForgotPasswordForm showToast={showToast} />
      </div>
    </>
  );
}
