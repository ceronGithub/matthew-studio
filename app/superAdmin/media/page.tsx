/**
 * FILE: app/superAdmin/media/page.tsx
 * ROLE: Super-admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard.
 *
 * PURPOSE:
 * task-120, super_admin_account_specification.md Section 9.3 — the
 * media library: every file already uploaded to Cloudflare R2, so an
 * existing image can be reused (Copy URL) instead of re-uploaded.
 * Stays a Server Component per Rule 31.1; all data fetching and
 * interactivity lives in the client-only MediaLibraryGrid below it,
 * same split as /superAdmin/announcements (task-118a).
 *
 * Read-only by design — uploading still happens through the product
 * and profile forms, never from this page.
 */
import type { Metadata } from "next";
import MediaLibraryGrid from "@/components/media/MediaLibraryGrid";
import "../../styles/superAdminMedia.css";

export const metadata: Metadata = {
  title: "Media Library | Matthew Studio Super Admin",
  description: "Browse every uploaded image and file in the media library and copy its URL for reuse.",
};

export default function SuperAdminMediaPage() {
  return (
    <section className="superAdminMediaPage">
      <div className="superAdminMediaHeader">
        <p className="superAdminMediaEyebrow">Super Admin</p>
        <h1 className="superAdminMediaTitle">Media Library</h1>
        <p className="superAdminMediaSubtitle">
          Everything already uploaded to storage. Copy a file&apos;s URL to reuse it instead of uploading it again.
        </p>
      </div>

      <MediaLibraryGrid />
    </section>
  );
}
