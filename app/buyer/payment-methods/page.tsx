/**
 * FILE: app/buyer/payment-methods/page.tsx
 * ROLE: Buyer only — protected by middleware.ts (role must be "buyer").
 *
 * PURPOSE:
 * Payment Methods (buyer_account_specification.md Section 4.3) — lets
 * a buyer see, add, remove, and set a default saved card for faster
 * checkout. Stays a Server Component per Rule 31.1; all data fetching
 * and interactivity lives in PaymentMethodsList below it. Wrapped in
 * Suspense because PaymentMethodsList reads useSearchParams() (to
 * detect a 3D-Secure return redirect) — Next.js requires that boundary
 * for any client component using the hook.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import PaymentMethodsList from "@/components/buyer/PaymentMethodsList";
import "../../styles/buyerPaymentMethods.css";

export const metadata: Metadata = {
  title: "Payment Methods | Matthew Studio",
  description: "Manage your saved payment methods.",
};

export default function BuyerPaymentMethodsPage() {
  return (
    <section className="paymentMethodsPage">
      <div className="paymentMethodsHeader">
        <p className="paymentMethodsEyebrow">Buyer dashboard</p>
        <h1 className="paymentMethodsTitle">Payment Methods</h1>
        <p className="paymentMethodsSubtitle">Save a card so checkout is one click next time.</p>
      </div>

      <Suspense fallback={<div className="paymentMethodsGrid" />}>
        <PaymentMethodsList />
      </Suspense>
    </section>
  );
}
