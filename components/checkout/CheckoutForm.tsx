/**
 * FILE: components/checkout/CheckoutForm.tsx
 * ROLE: Public — main content of the Checkout page (/checkout).
 *
 * PURPOSE:
 * Fetches the server-computed order summary from
 * /api/checkout/validate on mount (subtotal, shipping fee, total —
 * never computed client-side from possibly-stale cart state, per
 * cart_checkout_specification.md Section 4.2 step 3) and renders:
 * contact info (pre-filled email for signed-in buyers), a shipping
 * address section that only appears when the cart contains a physical
 * item (t-shirts), and the order summary itself. Any cart item that
 * was retired since being added is reported back by the API and
 * surfaced here as a warning toast, matching Rule 22.3's out-of-stock
 * message.
 *
 * PAYMENT (Phase 1 step 1d):
 * Submitting calls POST /api/checkout, which re-validates the cart
 * server-side, creates the pending Order + OrderItems, opens a
 * PayMongo Checkout Session for the server-computed total, and
 * returns a checkoutUrl — this component's only job on success is a
 * full-page redirect to it (never a client-side route change; it's
 * an external PayMongo-hosted URL). PayMongo's own success_url points
 * at /order-confirmation/[orderId] (components/checkout/
 * OrderConfirmation.tsx), which polls the webhook-driven order status
 * from there (step 1e/1f, both now built).
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, ShoppingBag, TriangleAlert } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import type { CheckoutSummaryData } from "@/app/api/checkout/validate/route";

interface CheckoutApiResponse {
  success: boolean;
  data: CheckoutSummaryData | null;
  message: string;
}

interface CheckoutSubmitResponse {
  success: boolean;
  data: { orderId: string; checkoutUrl: string } | null;
  message: string;
}

export default function CheckoutForm() {
  const [summary, setSummary] = useState<CheckoutSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary || isSubmitting) return;

    if (summary.requiresShipping && (!shippingName.trim() || !shippingAddress.trim() || !shippingPhone.trim())) {
      showToast("✕ Enter your full shipping details to continue.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shippingName, shippingAddress, shippingPhone }),
      });
      const payload: CheckoutSubmitResponse = await response.json();

      if (!payload.success || !payload.data) {
        showToast(`✕ ${payload.message || "We couldn't process your order. Please try again."}`, "error");
        setIsSubmitting(false);
        return;
      }

      // Full-page navigation, not next/link — this is PayMongo's own
      // hosted checkout domain, not a route within this app.
      window.location.href = payload.data.checkoutUrl;
    } catch {
      showToast("✕ We couldn't reach the server. Check your connection and try again.", "error");
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadSummary() {
      try {
        const response = await fetch("/api/checkout/validate");
        const payload: CheckoutApiResponse = await response.json();

        if (isCancelled) return;

        if (!payload.success || !payload.data) {
          setLoadError(payload.message || "Couldn't load your order summary. Please try again.");
          return;
        }

        setSummary(payload.data);
        if (payload.data.email) setEmail(payload.data.email);

        // One combined toast rather than one per item — several retired
        // items at once shouldn't stack several toasts on top of each
        // other (Rule 22.6 keeps the stack to what's actually useful).
        if (payload.data.removedItemNames.length > 0) {
          const summaryText =
            payload.data.removedItemNames.length === 1
              ? `${payload.data.removedItemNames[0]} is no longer available and was removed from your cart.`
              : `${payload.data.removedItemNames.length} items are no longer available and were removed from your cart.`;
          showToast(`⚠ ${summaryText}`, "warning");
        }
      } catch {
        if (!isCancelled) setLoadError("We couldn't reach the server. Check your connection and try again.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadSummary();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, showToast is stable
  }, []);

  if (isLoading) {
    return (
      <div className="checkoutLoading" role="status">
        <Loader2 size={28} strokeWidth={2} className="checkoutSpinner" aria-hidden="true" />
        <p>Loading your order summary…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="checkoutError" role="alert">
        <TriangleAlert size={28} strokeWidth={1.75} aria-hidden="true" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="checkoutEmpty" role="status">
        <ShoppingBag size={40} strokeWidth={1.25} aria-hidden="true" />
        <p>Your cart is empty.</p>
        <Link href="/products" className="buttonSecondary">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="checkoutLayout">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <form className="checkoutForm" noValidate onSubmit={handleSubmit} id="checkoutForm">
        <div className="checkoutFormSection">
          <h2 className="checkoutFormSectionTitle">Contact information</h2>
          <label className="checkoutFormField">
            <span>
              Email <span aria-hidden="true">*</span>
            </span>
            <input
              type="email"
              autoFocus
              required
              value={email}
              readOnly={summary.isLoggedIn}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {summary.isLoggedIn && (
            <p className="checkoutFormHint">Signed in — using your account email.</p>
          )}
        </div>

        {summary.requiresShipping && (
          <div className="checkoutFormSection">
            <h2 className="checkoutFormSectionTitle">Shipping address</h2>
            <p className="checkoutFormHint">Your order includes a physical item (t-shirt).</p>

            <label className="checkoutFormField">
              <span>
                Full name <span aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                required
                value={shippingName}
                onChange={(event) => setShippingName(event.target.value)}
              />
            </label>

            <label className="checkoutFormField">
              <span>
                Address <span aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
              />
            </label>

            <label className="checkoutFormField">
              <span>
                Phone <span aria-hidden="true">*</span>
              </span>
              <input
                type="tel"
                required
                value={shippingPhone}
                onChange={(event) => setShippingPhone(event.target.value)}
              />
            </label>
          </div>
        )}

        <p className="checkoutFormLegend">* Required fields</p>
      </form>

      <aside className="checkoutSummary">
        <h2 className="checkoutSummaryTitle">Order summary</h2>

        <ul className="checkoutSummaryItems">
          {summary.items.map((item) => {
            const Icon = CATEGORY_ICONS[item.iconName];
            return (
              <li key={item.id} className="checkoutSummaryItem">
                <div className="checkoutSummaryItemThumb">
                  {Icon && <Icon size={20} strokeWidth={1.5} aria-hidden="true" />}
                </div>
                <div className="checkoutSummaryItemBody">
                  <p className="checkoutSummaryItemName">
                    {item.name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </p>
                  {item.variant && <p className="checkoutSummaryItemVariant">{item.variant}</p>}
                </div>
                <p className="checkoutSummaryItemPrice">₱{item.lineTotal.toLocaleString("en-PH")}</p>
              </li>
            );
          })}
        </ul>

        <div className="checkoutSummaryTotals">
          <div className="checkoutSummaryRow">
            <span>Subtotal</span>
            <span>₱{summary.subtotal.toLocaleString("en-PH")}</span>
          </div>
          {summary.requiresShipping && (
            <div className="checkoutSummaryRow">
              <span>Shipping</span>
              <span>₱{summary.shippingFee.toLocaleString("en-PH")}</span>
            </div>
          )}
          <div className="checkoutSummaryRow checkoutSummaryRowTotal">
            <span>Total</span>
            <span>₱{summary.total.toLocaleString("en-PH")}</span>
          </div>
        </div>

        <button
          type="submit"
          form="checkoutForm"
          className="buttonPrimary checkoutPayButton"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} strokeWidth={2} className="checkoutSpinner" aria-hidden="true" />
              Redirecting to payment…
            </>
          ) : (
            "Pay with PayMongo"
          )}
        </button>
        <p className="checkoutFormHint">
          You&apos;ll be redirected to PayMongo&apos;s secure checkout to complete payment.
        </p>
      </aside>
    </div>
  );
}
