/**
 * FILE: app/(public)/order-confirmation/[orderId]/page.tsx
 * ROLE: Public — Order Confirmation page, served at
 * "/order-confirmation/[orderId]".
 *
 * PURPOSE:
 * Phase 1 step 1f of cart_checkout_specification.md Section 9 —
 * PayMongo's Checkout Session success_url (set in
 * services/paymongo.ts's createCheckoutSession call) already points
 * here; this route just didn't exist yet until now.
 *
 * DATA FLOW:
 * OrderConfirmation is a Client Component (polls
 * /api/orders/[orderId]/status) — this shell is static and just
 * passes the route param through.
 */
import type { Metadata } from "next";
import "../../../styles/checkout.css";
import OrderConfirmation from "@/components/checkout/OrderConfirmation";

export const metadata: Metadata = {
  title: "Order Confirmation | Matthew Studio",
  description: "Your order status and payment confirmation.",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <section className="checkoutSection">
      <div className="checkoutSectionInner">
        <header className="checkoutPageHeader">
          <p className="eyebrow">Order Confirmation</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Your order
          </h1>
        </header>

        <OrderConfirmation orderId={orderId} />
      </div>
    </section>
  );
}
