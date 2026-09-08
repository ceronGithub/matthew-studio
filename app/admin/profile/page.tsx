/**
 * FILE: app/admin/profile/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role
 * must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Admin Profile page (task-44, UI half, admin_account_specification.md
 * Section 3.8). Stays a Server Component per Rule 31.1 — all data
 * fetching and interactivity lives in the client-only ProfileForm
 * below it, same split as app/buyer/profile/page.tsx and
 * app/admin/security-logs/page.tsx.
 */
import type { Metadata } from "next";
import ProfileForm from "@/components/admin/ProfileForm";
import "../../styles/adminProfile.css";

export const metadata: Metadata = {
  title: "My Profile | Matthew Studio Admin",
  description: "Manage your account details, password, and notification preferences.",
};

export default function AdminProfilePage() {
  return (
    <section className="adminProfilePage">
      <div className="adminProfileHeader">
        <p className="adminProfileEyebrow">Admin</p>
        <h1 className="adminProfileTitle">My Profile</h1>
        <p className="adminProfileSubtitle">Manage your account details, password, and notification preferences.</p>
      </div>

      <ProfileForm />
    </section>
  );
}
