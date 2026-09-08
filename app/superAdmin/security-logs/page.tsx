/**
 * FILE: app/superAdmin/security-logs/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * Completes task-45 (UI half): the viewer page for
 * super_admin_account_specification.md Section 3.3 (Rule 38.9) and
 * the "Security Logs" quick action already linked from the
 * super-admin dashboard. Stays a Server Component per Rule 31.1 — all
 * fetching and interactivity lives in the client-only
 * SecurityLogsList below it, same split as
 * app/superAdmin/gatekeeper/page.tsx.
 */
import type { Metadata } from "next";
import SecurityLogsList from "@/components/security-logs/SecurityLogsList";
import "../../styles/securityLogs.css";

export const metadata: Metadata = {
  title: "Security Logs | Matthew Studio Admin",
  description: "Login attempts, anomalies, and attack patterns across the platform.",
};

export default function SuperAdminSecurityLogsPage() {
  return (
    <section className="securityLogsPage">
      <div className="securityLogsPageHeader">
        <p className="securityLogsPageEyebrow">Super-Admin</p>
        <h1 className="securityLogsPageTitle">Security Logs</h1>
        <p className="securityLogsPageSubtitle">
          Monitor and investigate security events platform-wide — login attempts, anomalies, and attack patterns.
        </p>
      </div>

      <SecurityLogsList />
    </section>
  );
}
