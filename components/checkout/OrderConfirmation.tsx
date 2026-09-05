/**
 * FILE: components/checkout/OrderConfirmation.tsx
 * ROLE: Public — main content of the order-confirmation page
 * (/order-confirmation/[orderId]), Phase 1 step 1f (cart_checkout
 * _specification.md Section 4.2 step 5 / Section 9 priority 6).
 *
 * PURPOSE:
 * PayMongo's Checkout Session redirects the buyer back here
 * (success_url set in services/paymongo.ts) the moment they finish on
 * PayMongo's hosted page. Payment confirmation itself is asynchronous
 * — the webhook (app/api/paymongo/webhook/route.ts) usually arrives
 * within a second or two, but not necessarily before this page has
 * already rendered. So this component shows "Payment processing…"
 * and polls GET /api/orders/[orderId]/status (Rule 30.4 pattern) every
 * few seconds until the Order flips to "PAID" — that same endpoint
 * also self-heals a missed webhook after it's been pending too long
 * (Gap B fix, see that route's header), so this page never needs to
 * know or care whether confirmation came from the webhook or the
 * self-heal path.
 *
 * DATA FLOW:
 * 1. On mount, immediately GET the order status once.
 * 2. If "pending", poll again every POLL_INTERVAL_MS until it isn't.
 * 3. On "PAID", fire the Rule 22.3 "Payment confirmed" toast, stop
 *    polling, and show the confirmed state.
 * 4. A 404 (order not found) or any other fetch failure shows an
 *    error state — never a silently-stuck spinner.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

interface OrderStatusResponse {
  success: boolean;
  data: { orderId: string; status: string } | null;
  message: string;
}

// Frequent enough that the buyer isn't left staring at a static
// "processing" screen for long, gentle enough not to hammer the
// endpoint's Rule 32.1 rate limit (100 / 15 min / IP) during a normal
// wait for the webhook.
const POLL_INTERVAL_MS = 3000;

type ConfirmationState = "loading" | "processing" | "confirmed" | "error";

interface OrderConfirmationProps {
  orderId: string;
}

export default function OrderConfirmation({ orderId }: OrderConfirmationProps) {
  const [state, setState] = useState<ConfirmationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { toasts, showToast, dismissToast } = useToast();
  const hasShownConfirmedToast = useRef(false);

  useEffect(() => {
    let isCancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`);
        const payload: OrderStatusResponse = await response.json();

        if (isCancelled) return;

        if (!payload.success || !payload.data) {
          setErrorMessage(payload.message || "We couldn't find that order.");
          setState("error");
          return;
        }

        if (payload.data.status === "pending") {
          setState("processing");
          pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
          return;
        }

        // Any non-"pending" status (PAID, or later fulfillment stages)
        // counts as confirmed here — this page's only job is to get
        // the buyer past the "is my payment even going through?"
        // moment, not to track fulfillment stages.
        setState("confirmed");
        if (!hasShownConfirmedToast.current) {
          hasShownConfirmedToast.current = true;
          showToast("✓ Payment received! Your order is confirmed.", "success");
        }
      } catch {
        if (isCancelled) return;
        setErrorMessage("We couldn't reach the server. Check your connection and try again.");
        setState("error");
      }
    }

    pollStatus();

    return () => {
      isCancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
    // orderId never changes after mount for this page — showToast is
    // stable (useCallback in useToast), so this only ever runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {(state === "loading" || state === "processing") && (
        <div className="checkoutLoading">
          <Loader2 size={28} className="checkoutSpinner" />
          <p>{state === "loading" ? "Checking your order…" : "Payment processing…"}</p>
          <p className="checkoutFormHint">This can take a few moments. Please don&apos;t close this page.</p>
        </div>
      )}

      {state === "confirmed" && (
        <div className="orderConfirmationConfirmed">
          <CheckCircle2 size={40} className="orderConfirmationConfirmedIcon" />
          <h2 className="checkoutSummaryTitle">Order confirmed</h2>
          <p className="checkoutFormHint">
            Thank you! Your order (<span className="orderConfirmationOrderId">{orderId}</span>) has been paid and is
            now being processed.
          </p>
          <div className="orderConfirmationActions">
            <Link href="/products" className="buttonSecondary">
              Continue shopping
            </Link>
            <Link href="/buyer/dashboard" className="buttonPrimary">
              Go to dashboard
            </Link>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="checkoutError">
          <TriangleAlert size={28} />
          <p>{errorMessage}</p>
          <Link href="/products" className="buttonSecondary">
            Back to shop
          </Link>
        </div>
      )}
    </>
  );
}
