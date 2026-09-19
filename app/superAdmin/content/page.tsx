/**
 * FILE: app/superAdmin/content/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * task-115 — the CMS page for Section 3.7. Stays a Server Component
 * per Rule 31.1 — all fetching and interactivity lives in the
 * client-only ContentEditor below it, same split as every other
 * super-admin page in this app.
 */
import type { Metadata } from "next";
import ContentEditor from "@/components/content/ContentEditor";
import "../../styles/content.css";

export const metadata: Metadata = {
  title: "Content | Matthew Studio Admin",
  description: "Edit all visitor-facing content without a code deployment.",
};

export default function SuperAdminContentPage() {
  return (
    <section className="contentPage">
      <div className="contentPageHeader">
        <p className="contentPageEyebrow">Super-Admin</p>
        <h1 className="contentPageTitle">Content</h1>
        <p className="contentPageSubtitle">
          Edit homepage, shop, standalone page, and site-wide content. Changes go live only after you click
          Publish.
        </p>
      </div>

      <ContentEditor />
    </section>
  );
}
