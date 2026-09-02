/**
 * FILE: app/admin/dashboard/page.tsx
 * ROLE: Admin only — protected by app/admin/layout.tsx's middleware guard.
 *
 * PURPOSE:
 * First screen an admin lands on after signing in
 * (login_and_registration_page.md Section 12.3). This is a scoped
 * placeholder — not a plain "coming soon" string (Rule 17's empty-state
 * guidance) — listing the sections admin_account_specification.md
 * defines as this area's real scope, so an admin knows the login
 * worked and what's still ahead rather than seeing a dead-end.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin dashboard | Matthew Studio",
  description: "Matthew Studio admin area.",
};

const PLANNED_SECTIONS = [
  "Product management",
  "Order management",
  "User management",
  "Analytics dashboard",
  "Security logs (non-sensitive events)",
];

export default function AdminDashboardPage() {
  return (
    <div className="roleAreaComingSoon">
      <span className="roleAreaComingSoonEyebrow">Admin dashboard</span>
      <h1 className="roleAreaComingSoonTitle">You&apos;re signed in as an admin</h1>
      <p className="roleAreaComingSoonSubtitle">
        This area is still being built out. Here&apos;s what&apos;s planned for it:
      </p>
      <ul className="roleAreaComingSoonList">
        {PLANNED_SECTIONS.map((section) => (
          <li key={section} className="roleAreaComingSoonListItem">
            {section}
          </li>
        ))}
      </ul>
    </div>
  );
}
