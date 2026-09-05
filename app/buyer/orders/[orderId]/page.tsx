/**
 * FILE: app/buyer/orders/[orderId]/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Order Tracking Detail (buyer_order_tracking_specification.md
 * Section 3.2). Stays a Server Component per Rule 31.1; all data
 * fetching and interactivity lives in the client-only
 * OrderTrackingDetail below it.
 */
import type { Metadata } from "next";
import OrderTrackingDetail from "@/components/buyer/OrderTrackingDetail";
import "../../../styles/buyerOrderDetail.css";

export const metadata: Metadata = {
  title: "Order Detail | Matthew Studio",
  description: "Track your order's progress.",
};

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return (
    <section className="orderDetailPage">
      <OrderTrackingDetail orderId={orderId} />
    </section>
  );
}
