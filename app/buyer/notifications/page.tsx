/**
 * FILE: app/buyer/notifications/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Notification history page (Task 13, buyer_account_specification.md
 * Section 4.6). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * NotificationsList below it — same split as app/buyer/support/page.tsx.
 */
import type { Metadata } from "next";
import NotificationsList from "@/components/buyer/NotificationsList";
import "../../styles/buyerNotifications.css";

export const metadata: Metadata = {
  title: "Notifications | Matthew Studio",
  description: "Order updates, billing events, and support replies.",
};

export default function BuyerNotificationsPage() {
  return (
    <section className="buyerNotificationsPage">
      <div className="buyerNotificationsHeader">
        <p className="buyerNotificationsEyebrow">Buyer dashboard</p>
        <h1 className="buyerNotificationsTitle">Notifications</h1>
        <p className="buyerNotificationsSubtitle">Everything that needs your attention, in one place.</p>
      </div>

      <NotificationsList />
    </section>
  );
}
