/**
 * FILE: app/buyer/orders/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Order History (buyer_order_tracking_specification.md Section 3.1) —
 * lets a buyer see every order they've placed. Stays a Server
 * Component per Rule 31.1; all data fetching and interactivity lives
 * in the client-only OrdersList below it.
 */
import type { Metadata } from "next";
import OrdersList from "@/components/buyer/OrdersList";
import "../../styles/buyerOrders.css";

export const metadata: Metadata = {
  title: "Orders | Matthew Studio",
  description: "Your order history and tracking.",
};

export default function BuyerOrdersPage() {
  return (
    <section className="buyerOrdersPage">
      <div className="buyerOrdersHeader">
        <p className="buyerOrdersEyebrow">Buyer dashboard</p>
        <h1 className="buyerOrdersTitle">Orders</h1>
        <p className="buyerOrdersSubtitle">Every order you&apos;ve placed, with live tracking for t-shirt production.</p>
      </div>

      <OrdersList />
    </section>
  );
}
