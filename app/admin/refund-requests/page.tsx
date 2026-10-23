/**
 * FILE: app/admin/refund-requests/page.tsx
 * ROLE: Admin/super-admin only — protected by middleware.ts (role must be
 * "admin" or "superAdmin"). The data routes it calls also need the
 * "manage-orders" permission.
 *
 * PURPOSE:
 * Refund requests queue (task-55e, additional_platform_gaps_specification.md
 * Section 4.2, admin side). Stays a Server Component per Rule 31.1; all
 * data fetching and interactivity lives in the client-only
 * RefundRequestsList below it, same split as app/admin/orders/page.tsx.
 */
import type { Metadata } from "next";
import RefundRequestsList from "@/components/admin/RefundRequestsList";
import "../../styles/adminRefundRequests.css";

export const metadata: Metadata = {
  title: "Refund Requests | Matthew Studio Admin",
  description: "Buyer refund requests waiting for an approve or deny decision.",
};

export default function AdminRefundRequestsPage() {
  return (
    <section className="refundQueuePage">
      <div className="refundQueueHeader">
        <p className="refundQueueEyebrow">Admin</p>
        <h1 className="refundQueueTitle">Refund Requests</h1>
        <p className="refundQueueSubtitle">
          Review each refund request from a buyer. Approving sends the money back through PayMongo and marks the order
          Refunded; denying needs a note the buyer will see.
        </p>
      </div>

      <RefundRequestsList />
    </section>
  );
}
