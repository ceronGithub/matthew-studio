/**
 * FILE: app/api/orders/[orderId]/status/route.ts
 * ROLE: Public (no session required — orderId is an unguessable cuid) —
 * polled by the order-confirmation page while awaiting the PayMongo
 * webhook (cart_checkout_specification.md Section 4.3/208, Rule 30.4
 * pattern: normally reads Order.status from the DB only).
 *
 * PURPOSE — SELF-HEAL FALLBACK (Gap B fix):
 * The webhook (app/api/paymongo/webhook/route.ts) is the primary path
 * for confirming payment, but it is a best-effort server-to-server
 * call from PayMongo — if it never arrives (network hiccup on either
 * side), the Order would otherwise stay "pending" forever even though
 * the buyer genuinely paid. Once an Order has been "pending" longer
 * than SELF_HEAL_THRESHOLD_SECONDS, this route makes the one
 * exception to Rule 30.3's "never re-query PayMongo in fulfillment
 * routes" rule — that rule exists to stop routes from re-verifying a
 * payment that was ALREADY confirmed by the webhook; here, by
 * definition, no confirmation has ever arrived, so there is nothing to
 * redundantly re-check. If PayMongo confirms the Checkout Session was
 * actually paid, this route calls the exact same markOrderPaid()
 * helper the webhook uses, so the Order flips to PAID and the cart is
 * cleared through one single code path either way.
 *
 * DATA FLOW:
 * 1. Rate limit (Rule 32.1 general tier: 100 / 15 min / IP) — this
 *    endpoint is polled repeatedly by the confirmation page.
 * 2. Load the Order. 404-shaped response if it doesn't exist — never
 *    leaks whether a similar-looking id exists for another buyer.
 * 3. If already PAID (or any later fulfillment status), return as-is
 *    — no need to ever call PayMongo again once confirmed.
 * 4. If still "pending" and younger than the threshold, return
 *    "pending" as-is — give the webhook its normal chance to arrive
 *    first before self-healing.
 * 5. If still "pending" and past the threshold, call PayMongo directly
 *    for this Order's Checkout Session. If it reports paid, run
 *    markOrderPaid() and return "PAID". If it reports the payment
 *    failed OR the session itself expired, run markOrderFailed() and
 *    return "FAILED" so the confirmation page can offer a retry
 *    instead of polling a dead session forever. Otherwise ("unpaid",
 *    session still active) return "pending" unchanged — the buyer may
 *    simply still be on PayMongo's page.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getCheckoutSession } from "@/services/paymongo";
import { markOrderPaid, markOrderFailed } from "@/lib/orderPayment";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

// Rule 32.1 general API tier: 100 requests / 15 minutes / IP.
const STATUS_MAX_ATTEMPTS = 100;
const STATUS_WINDOW_MINUTES = 15;

// How long a webhook is given to arrive on its own before this route
// starts asking PayMongo directly. Short enough that a buyer waiting
// on the confirmation page still self-heals within one session;
// long enough that a normal, slightly-delayed webhook isn't raced.
const SELF_HEAL_THRESHOLD_SECONDS = 90;

interface OrderStatusResponseData {
  orderId: string;
  status: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "order-status", STATUS_MAX_ATTEMPTS, STATUS_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many status checks. Please try again shortly." },
        { status: 429 }
      );
    }

    const { orderId } = await params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json(
        { success: false, data: null, message: "Order not found." },
        { status: 404 }
      );
    }

    // Already confirmed (or further along) — never re-query PayMongo
    // once the webhook or a prior self-heal already settled this
    // (Rule 30.3's normal rule applies from this point onward).
    if (order.status !== "pending") {
      const data: OrderStatusResponseData = { orderId: order.id, status: order.status };
      return NextResponse.json({ success: true, data, message: "Order status." });
    }

    const pendingForSeconds = (Date.now() - order.createdAt.getTime()) / 1000;
    const isSelfHealEligible = pendingForSeconds >= SELF_HEAL_THRESHOLD_SECONDS && Boolean(order.paymongoOrderId);

    if (!isSelfHealEligible) {
      const data: OrderStatusResponseData = { orderId: order.id, status: order.status };
      return NextResponse.json({ success: true, data, message: "Order status." });
    }

    // Self-heal: ask PayMongo directly since no webhook has confirmed
    // this Order yet, and it's been pending long enough that one
    // probably should have arrived by now (Gap B fix). Best-effort —
    // a failed lookup here just leaves the Order "pending" for the
    // next poll to retry, never surfaces as an error to the buyer.
    try {
      const paymentDetails = await getCheckoutSession(order.paymongoOrderId!);

      if (paymentDetails.isPaid) {
        await markOrderPaid({
          orderId: order.id,
          userId: order.userId,
          cartToken: order.cartToken,
          paymentId: paymentDetails.paymentId,
          paymentStatus: paymentDetails.paymentStatus,
          paidAt: paymentDetails.paidAt ?? new Date(),
        });

        await logSecurityEvent({
          eventType: "paymongo_selfheal_payment_confirmed",
          request,
          details: `orderId=${order.id} pendingForSeconds=${Math.round(pendingForSeconds)}`,
        });

        const data: OrderStatusResponseData = { orderId: order.id, status: "PAID" };
        return NextResponse.json({ success: true, data, message: "Order status." });
      }

      if (paymentDetails.isFailed || paymentDetails.isExpired) {
        // The webhook, by definition, never confirmed this Order —
        // and PayMongo now reports the attempt failed or the session
        // itself expired. Either way there is nothing left to keep
        // polling for, so flip to FAILED and let the confirmation
        // page offer the buyer a retry (retry-payment route) rather
        // than leaving them stuck on a "processing…" spinner.
        await markOrderFailed({
          orderId: order.id,
          paymentStatus: paymentDetails.paymentStatus ?? (paymentDetails.isExpired ? "expired" : "failed"),
        });

        await logSecurityEvent({
          eventType: "paymongo_selfheal_payment_failed",
          request,
          details: `orderId=${order.id} isExpired=${paymentDetails.isExpired} pendingForSeconds=${Math.round(pendingForSeconds)}`,
        });

        const data: OrderStatusResponseData = { orderId: order.id, status: "FAILED" };
        return NextResponse.json({ success: true, data, message: "Order status." });
      }
    } catch (selfHealError) {
      console.error("[orders/status][GET] Self-heal PayMongo lookup failed:", (selfHealError as Error).message);
    }

    const data: OrderStatusResponseData = { orderId: order.id, status: "pending" };
    return NextResponse.json({ success: true, data, message: "Order status." });
  } catch (error) {
    console.error("[orders/status][GET] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't check your order status. Please try again." },
      { status: 500 }
    );
  }
}
