/**
 * FILE: app/admin/security/totp-setup/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts's existing
 * "/admin/:path*" matcher (role must be "admin" or "superAdmin"); no
 * middleware change was needed for this nested route.
 *
 * PURPOSE:
 * TOTP enrollment page (task-47-ui-totp-enrollment, part 4 of 6 for
 * 2FA/TOTP, super_admin_account_specification.md Section 12 Phase 1).
 * Stays a Server Component per Rule 31.1 — all data fetching and
 * interactivity lives in the client-only TotpEnrollmentForm below it,
 * same split as app/admin/profile/page.tsx.
 *
 * Reached either voluntarily (e.g. a future link from account
 * settings) or via the forced-enrollment middleware gate that
 * task-47-totp-setup-gate will add — that gate is not built yet, so
 * for now this page is reachable directly at this URL.
 *
 * Wrapped in <Suspense> because TotpEnrollmentForm calls
 * useSearchParams() (to read an optional ?redirectTo= set by the
 * future setup gate), which Next.js requires to sit below a Suspense
 * boundary even on an otherwise server-rendered page.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import TotpEnrollmentForm from "@/components/admin/TotpEnrollmentForm";
import "../../../styles/adminTotpSetup.css";

export const metadata: Metadata = {
  title: "Two-Factor Authentication | Matthew Studio Admin",
  description: "Set up an authenticator app for two-factor authentication on your account.",
};

export default function AdminTotpSetupPage() {
  return (
    <section className="totpSetupPage">
      <div className="totpSetupHeader">
        <p className="totpSetupEyebrow">Security</p>
        <h1 className="totpSetupTitle">Two-Factor Authentication</h1>
        <p className="totpSetupSubtitle">Add an extra layer of protection to your account with an authenticator app.</p>
      </div>

      <Suspense fallback={<div className="totpSetupCard totpSetupSkeletonLine skeletonBlock" />}>
        <TotpEnrollmentForm />
      </Suspense>
    </section>
  );
}
