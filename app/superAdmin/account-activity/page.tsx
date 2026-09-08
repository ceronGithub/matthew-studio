/**
 * FILE: app/superAdmin/account-activity/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * Completes task-46: the viewer page for
 * super_admin_account_specification.md Section 3.4 (Rule 42.3) and
 * the "Account Activity" quick action already linked from the
 * super-admin dashboard. Stays a Server Component per Rule 31.1 — all
 * fetching and interactivity lives in the client-only
 * AccountActivityList below it, same split as
 * app/superAdmin/security-logs/page.tsx.
 */
import type { Metadata } from "next";
import AccountActivityList from "@/components/account-activity/AccountActivityList";
import "../../styles/accountActivity.css";

export const metadata: Metadata = {
  title: "Account Activity | Matthew Studio Admin",
  description: "What admin and super-admin accounts did, and from where.",
};

export default function SuperAdminAccountActivityPage() {
  return (
    <section className="accountActivityPage">
      <div className="accountActivityPageHeader">
        <p className="accountActivityPageEyebrow">Super-Admin</p>
        <h1 className="accountActivityPageTitle">Account Activity</h1>
        <p className="accountActivityPageSubtitle">
          Review what admin and super-admin accounts did across the platform, and from where.
        </p>
      </div>

      <AccountActivityList />
    </section>
  );
}
