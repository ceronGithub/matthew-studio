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
 * 4. On "FAILED" (the backend's own webhook/self-heal detected a
 *    declined payment or an expired PayMongo session — see
 *    app/api/orders/[orderId]/status/route.ts), stop polling and show
 *    a Retry Payment button that calls the retry-payment route and
 *    redirects to the fresh PayMongo checkout page.
 * 5. If still "pending" after POLL_TIMEOUT_MS total, stop polling on
 *    the client side too (rather than forever) and show a "timed
 *    out" state with a manual "Check again" button — the backend's
 *    own self-heal threshold in the status route will keep resolving
 *    the Order in the background either way; this is purely about
 *    not leaving the buyer staring at an infinite spinner.
 * 6. A 404 (order not found) or any other fetch failure shows an
 *    error state — never a silently-stuck spinner.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, TriangleAlert, Clock } from "lucide-react";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

interface OrderStatusResponse {
  success: boolean;
  data: { orderId: string; status: string } | null;
  message: string;
}

interface RetryPaymentResponse {
  success: boolean;
  data: { checkoutUrl: string } | null;
  message: string;
}

// Frequent enough that the buyer isn't left staring at a static
// "processing" screen for long, gentle enough not to hammer the
// endpoint's Rule 32.1 rate limit (100 / 15 min / IP) during a normal
// wait for the webhook.
const POLL_INTERVAL_MS = 3000;

// Total time this page keeps auto-polling before giving up and
// showing the buyer a manual "Check again" option instead of an
// infinite spinner. The backend's own self-heal threshold
// (SELF_HEAL_THRESHOLD_SECONDS in the status route) already resolves
// most stuck orders well before this fires — this is a client-side
// safety net for the rare case that doesn't.
const POLL_TIMEOUT_MS = 120_000;

type ConfirmationState = "loading" | "processing" | "confirmed" | "failed" | "timedOut" | "error";

interface OrderConfirmationProps {
  orderId: string;
}

export default function OrderConfirmation({ orderId }: OrderConfirmationProps) {
  const [state, setState] = useState<ConfirmationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  const hasShownConfirmedToast = useRef(false);
  // Tracks total elapsed polling time against POLL_TIMEOUT_MS —
  // wall-clock based (not a poll count) so it stays accurate even if
  // an individual fetch is slow. Set inside the effect (never during
  // render, which must stay pure) on mount and again on manual
  // "Check again" retries.
  const pollStartedAt = useRef<number>(0);

  useEffect(() => {
    let isCancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    pollStartedAt.current = Date.now();

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

        if (payload.data.status === "FAILED") {
          setState("failed");
          return;
        }

        if (payload.data.status === "pending") {
          // Client-side timeout net — the backend keeps self-healing
          // in the background regardless, but the buyer shouldn't be
          // left staring at a spinner forever (see file header).
          if (Date.now() - pollStartedAt.current >= POLL_TIMEOUT_MS) {
            setState("timedOut");
            return;
          }
          setState("processing");
          pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
          return;
        }

        // Any other non-"pending" status (PAID, or later fulfillment
        // stages) counts as confirmed here — this page's only job is
        // to get the buyer past the "is my payment even going
        // through?" moment, not to track fulfillment stages.
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

  /**
   * handleCheckAgain
   * Resets the elapsed-time clock and resumes polling from the
   * "timedOut" state — a single manual re-check rather than
   * re-mounting the whole polling effect.
   */
  function handleCheckAgain() {
    pollStartedAt.current = Date.now();
    setState("loading");
    fetch(`/api/orders/${orderId}/status`)
      .then((response) => response.json())
      .then((payload: OrderStatusResponse) => {
        if (!payload.success || !payload.data) {
          setErrorMessage(payload.message || "We couldn't find that order.");
          setState("error");
          return;
        }
        if (payload.data.status === "FAILED") {
          setState("failed");
        } else if (payload.data.status === "pending") {
          setState("timedOut");
        } else {
          setState("confirmed");
          if (!hasShownConfirmedToast.current) {
            hasShownConfirmedToast.current = true;
            showToast("✓ Payment received! Your order is confirmed.", "success");
          }
        }
      })
      .catch(() => {
        setErrorMessage("We couldn't reach the server. Check your connection and try again.");
        setState("error");
      });
  }

  /**
   * handleRetryPayment
   * Opens a fresh PayMongo Checkout Session for this same Order
   * (app/api/orders/[orderId]/retry-payment/route.ts) and redirects
   * the buyer there — mirrors how the original checkout redirect
   * works, just triggered from this page instead of the cart.
   */
  async function handleRetryPayment() {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, { method: "POST" });
      const payload: RetryPaymentResponse = await response.json();

      if (!payload.success || !payload.data) {
        showToast("✕ " + (payload.message || "We couldn't process your retry."), "error");
        setIsRetrying(false);
        return;
      }

      window.location.href = payload.data.checkoutUrl;
    } catch {
      showToast("✕ We couldn't reach the server. Please try again.", "error");
      setIsRetrying(false);
    }
  }

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

      {state === "failed" && (
        <div className="orderConfirmationFailed">
          <TriangleAlert size={40} className="orderConfirmationFailedIcon" />
          <h2 className="checkoutSummaryTitle">Payment didn&apos;t go through</h2>
          <p className="checkoutFormHint">
            Your order (<span className="orderConfirmationOrderId">{orderId}</span>) wasn&apos;t charged. Your items
            are still saved — you can try paying again.
          </p>
          <div className="orderConfirmationActions">
            <Link href="/products" className="buttonSecondary">
              Back to shop
            </Link>
            <button type="button" className="buttonPrimary" onClick={handleRetryPayment} disabled={isRetrying}>
              {isRetrying ? "Redirecting…" : "Retry Payment"}
            </button>
          </div>
        </div>
      )}

      {state === "timedOut" && (
        <div className="orderConfirmationTimedOut">
          <Clock size={40} className="orderConfirmationTimedOutIcon" />
          <h2 className="checkoutSummaryTitle">Still waiting on confirmation</h2>
          <p className="checkoutFormHint">
            This is taking longer than usual. Your payment may still be processing — check again in a moment.
          </p>
          <div className="orderConfirmationActions">
            <Link href="/products" className="buttonSecondary">
              Back to shop
            </Link>
            <button type="button" className="buttonPrimary" onClick={handleCheckAgain}>
              Check again
            </button>
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
