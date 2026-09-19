/**
 * FILE: app/superAdmin/announcements/page.tsx
 * ROLE: Super-admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard.
 *
 * PURPOSE:
 * task-118a, super_admin_account_specification.md Section 3.9 —
 * paginated list of site announcements (homepage-banner, shop-banner,
 * login-toast placements). Stays a Server Component per Rule 31.1;
 * all data fetching and interactivity lives in the client-only
 * AnnouncementsList below it, same split as
 * /superAdmin/products (task-112) and /superAdmin/content (task-115).
 *
 * This task (118a) builds the read-only list only. Create/Edit
 * (task-118b) and row actions — duplicate/deactivate/delete
 * (task-118c) — are wired in as separate, later tasks; the Actions
 * column here renders disabled stub buttons until then.
 */
import type { Metadata } from "next";
import AnnouncementsList from "@/components/announcements/AnnouncementsList";
import "../../styles/superAdminAnnouncements.css";

export const metadata: Metadata = {
  title: "Announcements | Matthew Studio Super Admin",
  description: "Manage site-wide announcements shown on the homepage banner, shop banner, and login toast.",
};

export default function SuperAdminAnnouncementsPage() {
  return (
    <section className="superAdminAnnouncementsPage">
      <div className="superAdminAnnouncementsHeader">
        <p className="superAdminAnnouncementsEyebrow">Super Admin</p>
        <h1 className="superAdminAnnouncementsTitle">Announcements</h1>
        <p className="superAdminAnnouncementsSubtitle">
          Manage announcements shown across the homepage banner, shop banner, and login toast.
        </p>
      </div>

      <AnnouncementsList />
    </section>
  );
}
