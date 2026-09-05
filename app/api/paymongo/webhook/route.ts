/**
 * FILE: app/api/paymongo/webhook/route.ts
 * ROLE: Public (no user session) — PayMongo webhook callback
 * (cart_checkout_specification.md Section 4.3, Rule 30, Phase 1 step 1e).
 *
 * PURPOSE:
 * The primary source of truth for payment confirmation (the
 * /api/orders/[orderId]/status self-heal path is the fallback for
 * when this webhook never arrives — see that route's header). Verifies
 * PayMongo's webhook signature before touching anything, then flips
 * the matching Order to "PAID" and fills in the three webhook-owned
 * fields (paymongoPaymentId, paymentStatus, paidAt) per Rule 30.1/30.2
 * via lib/orderPayment.ts's markOrderPaid() — which also clears the
 * cart that produced this Order, only now that payment is confirmed
 * (Gap A fix; see that file's header). No other route in this app is
 * allowed to set Order.status to "PAID" directly (Rule 30.3) — the
 * checkout submit route (1d) only ever creates "pending" orders.
 *
 * SIGNATURE VERIFICATION:
 * PayMongo sends a `Paymongo-Signature` header shaped like
 * `t=<unix_ts>,te=<test_hmac>,li=<live_hmac>` — the HMAC is
 * SHA-256(webhookSecret, `${t}.${rawBody}`). The raw, unparsed request
 * body is required for this to match (JSON.stringify(await
 * request.json()) would NOT reproduce PayMongo's exact byte sequence),
 * so this route reads the body as text first and parses it manually
 * afterward. Constant-time comparison (crypto.timingSafeEqual)
 * against both the test and live values — this endpoint doesn't know
 * in advance whether it's receiving a test or live event, and only
 * the correct secret can ever produce a matching HMAC for either.
 *
 * EVENT SHAPE (checkout_session.payment.paid):
 * event.data.attributes.type is the event name; event.data.attributes
 * .data is the Checkout Session object (its `.id` is the
 * `cs_...` value stored in Order.paymongoOrderId back in step 1d);
 * event.data.attributes.data.attributes.payments[0] holds the actual
 * payment (Rule 30.2's extraction pattern, which applies unchanged to
 * Checkout Sessions — same nested shape as the Payment Links product
 * the rule was originally written against).
 *
 * FAILED PAYMENTS: a `checkout_session.payment.failed` event flips
 * the Order to "FAILED" via lib/orderPayment.ts's markOrderFailed()
 * — deliberately never markOrderPaid()'s twin, since a failed
 * payment must NOT clear the buyer's cart/line items. The Order
 * stays in place so app/api/orders/[orderId]/retry-payment/route.ts
 * can open a new Checkout Session for the exact same Order.
 */
export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { logSecurityEvent } from "@/lib/securityLog";
import { markOrderPaid, markOrderFailed } from "@/lib/orderPayment";
import { createNotification } from "@/lib/notifications";

const SIGNATURE_HEADER = "paymongo-signature";

/**
 * PaymongoWebhookEvent
 * Minimal shape of the fields this route actually reads from a
 * PayMongo webhook payload — not a full type of PayMongo's API, just
 * enough to avoid `any` while still being honest that everything here
 * is external, unvalidated input (every field optional).
 */
interface PaymongoPayment {
  id?: string;
  attributes?: {
    status?: string;
    paid_at?: number;
  };
}

interface PaymongoWebhookEvent {
  data?: {
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          payments?: PaymongoPayment[];
        };
      };
    };
  };
}

interface ParsedSignatureHeader {
  timestamp: string | null;
  testSignature: string | null;
  liveSignature: string | null;
}

/**
 * parseSignatureHeader
 * Splits "t=...,te=...,li=..." into its three named parts. Any part
 * PayMongo didn't send comes back null rather than throwing, so a
 * malformed header just fails the signature check below instead of
 * crashing the route.
 */
function parseSignatureHeader(header: string | null): ParsedSignatureHeader {
  const result: ParsedSignatureHeader = { timestamp: null, testSignature: null, liveSignature: null };
  if (!header) return result;

  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") result.timestamp = value ?? null;
    if (key === "te") result.testSignature = value ?? null;
    if (key === "li") result.liveSignature = value ?? null;
  }
  return result;
}

/**
 * computeExpectedSignature
 * HMAC-SHA256 of "{timestamp}.{rawBody}" using the webhook signing
 * secret — PayMongo's documented signing scheme.
 */
function computeExpectedSignature(timestamp: string, rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/**
 * signaturesMatch
 * Constant-time comparison so a near-miss forged signature can't be
 * narrowed down byte-by-byte via response timing. Also guards against
 * length mismatches, which timingSafeEqual throws on rather than
 * returning false for.
 */
function signaturesMatch(expected: string, candidate: string | null): boolean {
  if (!candidate || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[paymongo][webhook] PAYMONGO_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ success: false, data: null, message: "Webhook not configured." }, { status: 500 });
  }

  const { timestamp, testSignature, liveSignature } = parseSignatureHeader(request.headers.get(SIGNATURE_HEADER));

  if (!timestamp) {
    await logSecurityEvent({
      eventType: "paymongo_webhook_signature_invalid",
      request,
      details: "Missing Paymongo-Signature header or timestamp.",
    });
    return NextResponse.json({ success: false, data: null, message: "Invalid signature." }, { status: 401 });
  }

  const expectedSignature = computeExpectedSignature(timestamp, rawBody, webhookSecret);
  const isValid = signaturesMatch(expectedSignature, testSignature) || signaturesMatch(expectedSignature, liveSignature);

  if (!isValid) {
    // Security boundary (Section 4.3) — reject and log as a
    // suspicious event before parsing/trusting anything in the body.
    await logSecurityEvent({
      eventType: "paymongo_webhook_signature_invalid",
      request,
      details: "Paymongo-Signature did not match computed HMAC.",
    });
    return NextResponse.json({ success: false, data: null, message: "Invalid signature." }, { status: 401 });
  }

  let event: PaymongoWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, data: null, message: "Malformed payload." }, { status: 400 });
  }

  const eventType: string | undefined = event?.data?.attributes?.type;
  const checkoutSession = event?.data?.attributes?.data;
  const checkoutSessionId: string | undefined = checkoutSession?.id;

  if (!checkoutSessionId) {
    return NextResponse.json({ success: false, data: null, message: "Missing checkout session id." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { paymongoOrderId: checkoutSessionId } });
  if (!order) {
    // Not this app's order (or already-deleted failed-session cleanup
    // from step 1d) — acknowledge with 200 so PayMongo doesn't retry
    // indefinitely for an event we'll never be able to match.
    return NextResponse.json({ success: true, data: null, message: "No matching order." });
  }

  if (eventType === "checkout_session.payment.failed") {
    // Rule 30.2's same nested extraction, just to read the failure's
    // paymentStatus for the log line — markOrderFailed() never
    // touches the cart (see file header), so a failed payment always
    // leaves the Order retryable.
    const failedPayments: PaymongoPayment[] = checkoutSession?.attributes?.payments ?? [];
    const failedPaymentStatus: string | undefined = failedPayments[0]?.attributes?.status;

    await markOrderFailed({ orderId: order.id, paymentStatus: failedPaymentStatus ?? "failed" });

    // Guest checkouts have no buyer account to notify (Order.userId
    // is null) — only signed-in buyers get a Notification row.
    if (order.userId) {
      await createNotification({
        userId: order.userId,
        type: "order_update",
        title: "Payment failed",
        body: `We couldn't process payment for order #${order.id.slice(-8)}. You can retry from your orders page.`,
        linkHref: `/buyer/orders/${order.id}`,
      });
    }

    await logSecurityEvent({
      eventType: "paymongo_webhook_payment_failed",
      request,
      details: `orderId=${order.id} paymentStatus=${failedPaymentStatus ?? "failed"}`,
    });

    return NextResponse.json({ success: true, data: null, message: "Order marked as failed." });
  }

  if (eventType !== "checkout_session.payment.paid") {
    // Any other event this app doesn't act on — acknowledged so
    // PayMongo doesn't retry, but Order.status is left unchanged.
    await logSecurityEvent({
      eventType: "paymongo_webhook_unhandled_event",
      request,
      details: `eventType=${eventType ?? "unknown"} orderId=${order.id}`,
    });
    return NextResponse.json({ success: true, data: null, message: "Event acknowledged." });
  }

  // Rule 30.2's exact extraction pattern.
  const payments: PaymongoPayment[] = checkoutSession?.attributes?.payments ?? [];
  const paymentId: string | undefined = payments[0]?.id;
  const paymentStatus: string | undefined = payments[0]?.attributes?.status;
  const paidAt = payments[0]?.attributes?.paid_at ? new Date(payments[0].attributes.paid_at * 1000) : new Date();

  // Flips the Order to PAID and clears the cart that produced it, in
  // one place shared with the self-heal status endpoint (Gap A fix).
  await markOrderPaid({
    orderId: order.id,
    userId: order.userId,
    cartToken: order.cartToken,
    paymentId: paymentId ?? null,
    paymentStatus: paymentStatus ?? "paid",
    paidAt,
  });

  // Guest checkouts have no buyer account to notify (Order.userId is
  // null) — only signed-in buyers get a Notification row.
  if (order.userId) {
    await createNotification({
      userId: order.userId,
      type: "order_update",
      title: "Payment received",
      body: `Your payment for order #${order.id.slice(-8)} was confirmed.`,
      linkHref: `/buyer/orders/${order.id}`,
    });
  }

  await logSecurityEvent({
    eventType: "paymongo_webhook_payment_paid",
    request,
    details: `orderId=${order.id} paymentId=${paymentId ?? "unknown"}`,
  });

  return NextResponse.json({ success: true, data: null, message: "Order marked as paid." });
}
