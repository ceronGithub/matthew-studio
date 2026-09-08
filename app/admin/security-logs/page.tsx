/**
 * FILE: app/admin/security-logs/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin"); the "view-security-logs"
 * permission itself is enforced server-side by GET
 * /api/admin/security-logs (task-42, API half), not here.
 *
 * PURPOSE:
 * Admin Security Logs page (task-42, UI half,
 * admin_account_specification.md Section 3.6). Stays a Server
 * Component per Rule 31.1 — all fetching and interactivity lives in
 * the client-only AdminSecurityLogsList below it, same split as
 * app/admin/analytics/page.tsx and app/superAdmin/security-logs/page.tsx.
 */
import type { Metadata } from "next";
import AdminSecurityLogsList from "@/components/security-logs/AdminSecurityLogsList";
import "../../styles/securityLogs.css";

export const metadata: Metadata = {
  title: "Security Logs | Matthew Studio Admin",
  description: "Your own login attempts and security events.",
};

export default function AdminSecurityLogsPage() {
  return (
    <section className="securityLogsPage">
      <div className="securityLogsPageHeader">
        <p className="securityLogsPageEyebrow">Admin</p>
        <h1 className="securityLogsPageTitle">Security Logs</h1>
        <p className="securityLogsPageSubtitle">
          Review your own login attempts and security events — this view only shows activity on your account.
        </p>
      </div>

      <AdminSecurityLogsList />
    </section>
  );
}
