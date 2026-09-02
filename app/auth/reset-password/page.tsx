/**
 * FILE: app/auth/reset-password/page.tsx
 * ROLE: Public — served at "/auth/reset-password". This is the link
 * destination in the password-reset email sent from
 * /api/auth/forgot-password.
 *
 * PURPOSE:
 * Same glass-card-over-slideshow shell as /auth/login. Renders
 * ResetPasswordForm, which verifies the Supabase recovery session
 * from the email link and collects the new password.
 */
"use client";

import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AuthBackgroundSlideshow from "@/components/auth/AuthBackgroundSlideshow";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <>
      <AuthBackgroundSlideshow />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="authGlassCard">
        <h1 className="authPageHeading">Reset your password</h1>
        <ResetPasswordForm showToast={showToast} />
      </div>
    </>
  );
}
