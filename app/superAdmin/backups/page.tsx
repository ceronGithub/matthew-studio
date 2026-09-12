/**
 * FILE: app/superAdmin/backups/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * task-105 — the mandatory Backups page for Rule 40.6. Stays a
 * Server Component per Rule 31.1 — all fetching and interactivity
 * lives in the client-only BackupsList below it, same split as
 * app/superAdmin/security-logs/page.tsx and
 * app/superAdmin/account-activity/page.tsx.
 *
 * Strictly read-only page: it never triggers a backup. Runs happen
 * only via scripts/runBackup.ts (task-102) on its own CI schedule
 * (task-103), or an on-demand GitHub Actions workflow_dispatch —
 * never through this app (Rule 40.1/40.6).
 */
import type { Metadata } from "next";
import BackupsList from "@/components/backups/BackupsList";
import "../../styles/backups.css";

export const metadata: Metadata = {
  title: "Backups | Matthew Studio Admin",
  description: "Database backup history — status, size, and storage destinations.",
};

export default function SuperAdminBackupsPage() {
  return (
    <section className="backupsPage">
      <div className="backupsPageHeader">
        <p className="backupsPageEyebrow">Super-Admin</p>
        <h1 className="backupsPageTitle">Backups</h1>
        <p className="backupsPageSubtitle">
          Database backup history across all configured destinations. This page is read-only — backups run on
          their own schedule and are never triggered from here.
        </p>
      </div>

      <BackupsList />
    </section>
  );
}
