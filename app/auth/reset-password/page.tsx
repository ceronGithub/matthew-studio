/**
 * FILE: app/auth/reset-password/page.tsx
 * ROLE: Public — served at "/auth/reset-password?token=...". This is
 * the link destination in the password-reset email/step sent from
 * the /auth/forgot-password wizard (task-69).
 *
 * PURPOSE:
 * Same glass-card-over-slideshow shell as /auth/login. Renders
 * ResetPasswordForm (task-70), which consumes the `?token=` query
 * param directly against /api/auth/forgot-password/reset — no
 * Supabase recovery session involved anymore.
 *
 * Wrapped in <Suspense> because ResetPasswordForm calls
 * useSearchParams(), which Next.js requires to sit below a Suspense
 * boundary even on a fully "use client" page.
 */
"use client";

import { Suspense } from "react";
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
        <Suspense fallback={<p className="authPageDescription">Loading…</p>}>
          <ResetPasswordForm showToast={showToast} />
        </Suspense>
      </div>
    </>
  );
}
