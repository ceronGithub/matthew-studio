/**
 * FILE: app/superAdmin/dashboard/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard.
 *
 * PURPOSE:
 * First screen a super-admin lands on after signing in
 * (login_and_registration_page.md Section 12.3). Scoped placeholder —
 * see app/admin/dashboard/page.tsx's header comment for why this
 * exists instead of the full build. Sections listed come from
 * super_admin_account_specification.md Section 3.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super-admin dashboard | Matthew Studio",
  description: "Matthew Studio super-admin area.",
};

const PLANNED_SECTIONS = [
  "Admin management (create, edit, deactivate admin accounts)",
  "Security logs",
  "Account activity log",
  "Backups",
  "Vault / emergency credentials",
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="roleAreaComingSoon">
      <span className="roleAreaComingSoonEyebrow">Super-admin dashboard</span>
      <h1 className="roleAreaComingSoonTitle">You&apos;re signed in as super-admin</h1>
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
