/**
 * FILE: app/superAdmin/gatekeeper/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * Completes task-33 (UI half): the viewer page for
 * gatekeeper_specification.md Sections 5.2/8/9 and the "Gatekeeper /
 * Device Bans" quick action already linked from the super-admin
 * dashboard. Stays a Server Component per Rule 31.1 — all fetching
 * and interactivity lives in the client-only GatekeeperBansList
 * below it, same split as app/admin/products/page.tsx.
 */
import type { Metadata } from "next";
import GatekeeperBansList from "@/components/gatekeeper/GatekeeperBansList";
import "../../styles/gatekeeper.css";

export const metadata: Metadata = {
  title: "Gatekeeper | Matthew Studio Admin",
  description: "Banned devices and manual ban/unban controls.",
};

export default function SuperAdminGatekeeperPage() {
  return (
    <section className="gatekeeperPage">
      <div className="gatekeeperPageHeader">
        <p className="gatekeeperPageEyebrow">Super-Admin</p>
        <h1 className="gatekeeperPageTitle">Gatekeeper</h1>
        <p className="gatekeeperPageSubtitle">
          Devices banned automatically by strike/instant triggers, or manually by a super-admin.
        </p>
      </div>

      <GatekeeperBansList />
    </section>
  );
}
