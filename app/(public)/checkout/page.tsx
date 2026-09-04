/**
 * FILE: app/(public)/checkout/page.tsx
 * ROLE: Public — Checkout page, served at "/checkout".
 *
 * PURPOSE:
 * Phase 1 step 1c of cart_checkout_specification.md Section 9. Shows
 * the buyer's contact info, a shipping address section (only when the
 * cart contains a physical item — t-shirts), and a server-computed
 * order summary. Linked from CartDrawer's "Proceed to Checkout" button
 * and from the cart icon once items exist.
 *
 * Payment itself (the "Pay with PayMongo" button actually submitting)
 * is step 1d, built next — see CheckoutForm.tsx's own header comment.
 *
 * DATA FLOW:
 * CheckoutForm is a Client Component (fetches the live order summary
 * from /api/checkout/validate on mount, and reads/writes form state)
 * — everything else on this page is static.
 */
import type { Metadata } from "next";
import "../../styles/checkout.css";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout | Matthew Studio",
  description: "Review your order and complete your purchase.",
};

export default function CheckoutPage() {
  return (
    <section className="checkoutSection">
      <div className="checkoutSectionInner">
        <header className="checkoutPageHeader">
          <p className="eyebrow">Checkout</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Review your order
          </h1>
        </header>

        <CheckoutForm />
      </div>
    </section>
  );
}
