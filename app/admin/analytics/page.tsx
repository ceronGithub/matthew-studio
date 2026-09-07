/**
 * FILE: app/admin/analytics/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin"); the "view-analytics" permission
 * itself is enforced server-side by GET /api/admin/analytics
 * (task-92), not here.
 *
 * PURPOSE:
 * Admin Analytics Dashboard (task-93, admin_account_specification.md
 * Section 3.5) — completes task-65's split (task-92 API + task-93
 * UI). Stays a Server Component per Rule 31.1: this page has no
 * interactivity of its own (filters/fetching live in the client-only
 * AdminAnalytics below it), same split as app/admin/orders/page.tsx
 * and app/admin/products/page.tsx.
 */
import type { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import "../../styles/analytics.css";
import "../../styles/adminAnalytics.css";

export const metadata: Metadata = {
  title: "Analytics | Matthew Studio Admin",
  description: "Orders, revenue, category performance, and buyer metrics over time.",
};

export default function AdminAnalyticsPage() {
  return (
    <section className="analyticsPage">
      <div className="analyticsPageHeader">
        <p className="analyticsPageEyebrow">Admin</p>
        <h1 className="analyticsPageTitle">Analytics</h1>
        <p className="analyticsPageSubtitle">
          Orders, revenue, category performance, and buyer metrics — filter by date range and category below.
        </p>
      </div>

      <AdminAnalytics />
    </section>
  );
}
