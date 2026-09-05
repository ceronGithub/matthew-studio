/**
 * FILE: app/api/orders/[orderId]/retry-payment/route.ts
 * ROLE: Public (no session required — orderId is an unguessable cuid,
 * same trust model as app/api/orders/[orderId]/status/route.ts) —
 * called by the order-confirmation page's "Retry Payment" button
 * (components/checkout/OrderConfirmation.tsx "failed" state).
 *
 * PURPOSE:
 * A FAILED Order (declined card, expired checkout session, etc. —
 * see lib/orderPayment.ts's markOrderFailed()) is never deleted, so
 * the buyer doesn't have to rebuild their cart from scratch just
 * because one payment attempt didn't go through. This route opens a
 * brand-new PayMongo Checkout Session for the SAME Order — same
 * OrderItem rows, same total — and flips Order.status back to
 * "pending" so the whole confirmation/webhook/self-heal flow runs
 * again exactly as it did the first time.
 *
 * LINE ITEMS come from the Order's own OrderItem snapshots
 * (nameSnapshot/priceSnapshot/variant/quantity), never a live cart
 * re-lookup — the buyer's cart may have changed or been emptied
 * since the original checkout, and a retry must charge the exact
 * same total the buyer already agreed to, not whatever is in their
 * cart right now (mirrors the "snapshot, never a live join" rule
 * cart_checkout_specification.md Section 4.4 applies to OrderItem in
 * the first place).
 *
 * EMAIL LOOKUP: guest orders already have Order.guestEmail. Signed-in
 * buyers do not — this app has no Prisma `User` model (Supabase Auth
 * is the source of truth for accounts), so the buyer's email is
 * fetched via supabaseAdminClient.auth.admin.getUserById(order.userId)
 * rather than a Prisma query that would never have compiled.
 *
 * SHIPPING NAME/ADDRESS/PHONE — KNOWN GAP: the Order model only
 * persists shippingFee (Rule 30.1 fields cover payment, not the
 * original shipping form). A retry therefore rebuilds the PayMongo
 * billing object with email only; PayMongo's billing.name/phone/
 * address are optional (services/paymongo.ts), so this still creates
 * a valid Checkout Session — it just means the buyer's shipping
 * details won't pre-fill on PayMongo's page a second time. Flagged
 * here rather than silently expanding the Order schema for this fix.
 *
 * WHY THIS ROUTE, NOT app/api/checkout/route.ts:
 * The checkout route always creates a brand-new Order (Rule 30.3 —
 * only ever "pending"). Reusing it here would create a second,
 * duplicate Order for the same cart. This route is the one
 * documented exception (per that route's own comments) that mutates
 * an existing Order's paymongoOrderId/status back to "pending".
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import type { OrderItem } from "@prisma/client";
import { createCheckoutSession, type CheckoutLineItemInput } from "@/services/paymongo";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

// Rule 32.1 payment-endpoint tier: 10 requests / 15 minutes / IP —
// same tier as the original checkout route, since this also opens a
// real PayMongo Checkout Session.
const RETRY_MAX_ATTEMPTS = 10;
const RETRY_WINDOW_MINUTES = 15;

interface RetryPaymentResponseData {
  checkoutUrl: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "retry-payment", RETRY_MAX_ATTEMPTS, RETRY_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many retry attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const { orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, data: null, message: "Order not found." }, { status: 404 });
    }

    // Only a FAILED order is retryable through this route — a
    // "pending" order still has an active session to finish, and a
    // "PAID" (or later) order has nothing left to retry.
    if (order.status !== "FAILED") {
      return NextResponse.json(
        { success: false, data: null, message: "This order isn't eligible for a payment retry." },
        { status: 400 }
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { success: false, data: null, message: "This order has no items to retry." },
        { status: 400 }
      );
    }

    // Resolve the email PayMongo's billing object needs — guest
    // orders already have it; signed-in buyers are looked up via
    // Supabase Auth (see file header — never a Prisma User query).
    let email = order.guestEmail ?? "";
    if (!email && order.userId) {
      const { data, error } = await supabaseAdminClient.auth.admin.getUserById(order.userId);
      if (error || !data?.user?.email) {
        console.error("[orders/retry-payment][POST] Could not resolve buyer email:", error?.message);
        return NextResponse.json(
          { success: false, data: null, message: "We couldn't process your retry. Please try again." },
          { status: 500 }
        );
      }
      email = data.user.email;
    }

    if (!email) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't process your retry. Please try again." },
        { status: 500 }
      );
    }

    // Rebuild line items from the Order's own snapshots (see file
    // header) — never a live cart re-lookup.
    const items: CheckoutLineItemInput[] = order.items.map((item: OrderItem) => ({
      name: item.nameSnapshot,
      unitPrice: item.priceSnapshot,
      variant: item.variant,
      quantity: item.quantity,
    }));

    const requiresShipping = order.shippingFee > 0;
    const origin = new URL(request.url).origin;

    let checkoutSessionId: string;
    let checkoutUrl: string;
    try {
      const session = await createCheckoutSession({
        items,
        shippingFee: order.shippingFee,
        requiresShipping,
        email,
        orderId: order.id,
        successUrl: `${origin}/order-confirmation/${order.id}`,
        cancelUrl: `${origin}/checkout`,
      });
      checkoutSessionId = session.checkoutSessionId;
      checkoutUrl = session.checkoutUrl;
    } catch (paymongoError) {
      console.error("[orders/retry-payment][POST] PayMongo session creation failed:", (paymongoError as Error).message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't process your retry. Please try again." },
        { status: 502 }
      );
    }

    // Back to "pending" — the confirmation page's normal poll/webhook/
    // self-heal flow takes it from here, exactly as on first checkout.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "pending",
        paymongoOrderId: checkoutSessionId,
        paymentStatus: null,
      },
    });

    await logSecurityEvent({
      eventType: "order_payment_retried",
      request,
      details: `orderId=${order.id}`,
    });

    const data: RetryPaymentResponseData = { checkoutUrl };
    return NextResponse.json({ success: true, data, message: "Redirecting you to payment…" });
  } catch (error) {
    console.error("[orders/retry-payment][POST] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't process your retry. Please try again." },
      { status: 500 }
    );
  }
}
