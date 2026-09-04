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
 * PAYMENT — NOT YET WIRED (Phase 1 step 1d):
 * The "Pay with PayMongo" button is intentionally disabled. Actually
 * creating the Order row and a PayMongo Payment Link
 * (cart_checkout_specification.md Section 4.3/4.4) is the next build
 * step — wiring a fake/incomplete submit here would leave the buyer
 * with no real payment flow and no way to know their order didn't
 * actually go through, which is worse than an honest "coming soon."
 */
"use client";

import { useEffect, useState } from "react";
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

export default function CheckoutForm() {
  const [summary, setSummary] = useState<CheckoutSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const { toasts, showToast, dismissToast } = useToast();

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

      <form className="checkoutForm" noValidate>
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

        <button type="button" className="buttonPrimary checkoutPayButton" disabled title="Online payment launches soon">
          Pay with PayMongo
        </button>
        <p className="checkoutFormHint">
          Online payment launches with the next update — your cart is saved in the meantime.
        </p>
      </aside>
    </div>
  );
}
