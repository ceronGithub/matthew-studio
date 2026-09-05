/**
 * FILE: app/superAdmin/dashboard/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard.
 *
 * PURPOSE:
 * Real dashboard home (super_admin_account_specification.md Section
 * 3.1, Phase 2) — replaces the earlier "coming soon" placeholder.
 * Renders:
 *   - Health widget: live counts from SecurityLog/DeviceBan
 *   - Recent Activity: latest AccountActivityLog rows
 *   - Quick Actions: links to the Phase 2 viewer pages
 *   - Analytics summary: stub — real charts land in Phase 9
 * Data fetching happens directly in this Server Component (Rule
 * 31.1/31.2) — no client-side fetch, no API route needed for
 * read-only dashboard data.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, Ban, Activity, ArrowRight, BarChart3 } from "lucide-react";
import { getDashboardHealthStats, getRecentAccountActivity } from "@/lib/dashboardStats";
import "../../styles/superAdminDashboard.css";

export const metadata: Metadata = {
  title: "Super-admin dashboard | Matthew Studio",
  description: "Matthew Studio super-admin area.",
};

const QUICK_ACTIONS = [
  {
    href: "/superAdmin/security-logs",
    label: "Security Logs",
    description: "Login attempts, anomalies, and attack patterns",
    icon: ShieldAlert,
  },
  {
    href: "/superAdmin/account-activity",
    label: "Account Activity",
    description: "What admin/super-admin accounts did, and from where",
    icon: Activity,
  },
  {
    href: "/superAdmin/gatekeeper",
    label: "Gatekeeper / Device Bans",
    description: "Review and manually unban flagged devices",
    icon: Ban,
  },
];

export default async function SuperAdminDashboardPage() {
  // Both queries fail soft (return zeros/empty array) — a stats
  // outage should never take down the dashboard shell itself.
  const [healthStats, recentActivity] = await Promise.all([
    getDashboardHealthStats(),
    getRecentAccountActivity(8),
  ]);

  return (
    <section className="dashboardHome">
      <div className="dashboardHomeHeader">
        <span className="dashboardHomeEyebrow">Super-admin dashboard</span>
        <h1 className="dashboardHomeTitle">Overview</h1>
      </div>

      {/* Health widget — live SecurityLog/DeviceBan counts */}
      <section aria-label="System health">
        <div className="dashboardStatGrid">
          <article className="dashboardStatCard">
            <ShieldCheck size={18} className="dashboardStatIcon" />
            <span className="dashboardStatValue">{healthStats.securityEvents24h}</span>
            <span className="dashboardStatLabel">Security events (24h)</span>
          </article>
          <article className="dashboardStatCard dashboardStatCardWarning">
            <ShieldAlert size={18} className="dashboardStatIcon" />
            <span className="dashboardStatValue">{healthStats.failedLogins24h}</span>
            <span className="dashboardStatLabel">Failed logins (24h)</span>
          </article>
          <article className="dashboardStatCard dashboardStatCardError">
            <Ban size={18} className="dashboardStatIcon" />
            <span className="dashboardStatValue">{healthStats.activeBans}</span>
            <span className="dashboardStatLabel">Active device bans</span>
          </article>
          <article className="dashboardStatCard">
            <Activity size={18} className="dashboardStatIcon" />
            <span className="dashboardStatValue">{healthStats.totalSecurityEvents}</span>
            <span className="dashboardStatLabel">Total security events</span>
          </article>
        </div>
      </section>

      <div className="dashboardHomeGrid">
        {/* Recent Activity */}
        <section aria-label="Recent activity" className="dashboardPanel">
          <h2 className="dashboardPanelTitle">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="dashboardEmptyState">No account activity recorded yet.</p>
          ) : (
            <ul className="dashboardActivityList">
              {recentActivity.map((row) => (
                <li key={row.id} className="dashboardActivityItem">
                  <span className="dashboardActivityAccount">{row.accountId}</span>
                  <span className="dashboardActivityAction">{row.action}</span>
                  <span className="dashboardActivityMeta">
                    {row.geoCity ? `${row.geoCity}, ${row.geoCountry}` : "Unknown location"} ·{" "}
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick Actions */}
        <section aria-label="Quick actions" className="dashboardPanel">
          <h2 className="dashboardPanelTitle">Quick Actions</h2>
          <ul className="dashboardQuickActionList">
            {QUICK_ACTIONS.map(({ href, label, description, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="dashboardQuickActionLink">
                  <Icon size={18} className="dashboardQuickActionIcon" />
                  <span className="dashboardQuickActionText">
                    <span className="dashboardQuickActionLabel">{label}</span>
                    <span className="dashboardQuickActionDescription">{description}</span>
                  </span>
                  <ArrowRight size={16} className="dashboardQuickActionArrow" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Analytics summary — stub, real charts arrive in Phase 9 */}
      <section aria-label="Analytics summary" className="dashboardPanel">
        <h2 className="dashboardPanelTitle">Analytics Summary</h2>
        <div className="dashboardAnalyticsStub">
          <BarChart3 size={24} className="dashboardAnalyticsStubIcon" />
          <p className="dashboardAnalyticsStubText">
            Traffic and reporting charts are built in Phase 9 (Analytics &amp; Reporting).
          </p>
        </div>
      </section>
    </section>
  );
}
