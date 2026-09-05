/**
 * FILE: lib/orderPayment.ts
 * PURPOSE:
 * Single shared implementation of "an Order was actually paid" —
 * flips Order.status to "PAID" (Rule 30.1/30.2 fields) and, only at
 * that confirmed moment, clears the cart that produced it.
 *
 * WHY THIS EXISTS (Gap A / Gap B fix — cart_checkout_specification.md
 * Section 4.3):
 * Two different callers need to reach this exact same end state:
 *   1. app/api/paymongo/webhook/route.ts — the normal path, triggered
 *      by PayMongo's server-to-server webhook call.
 *   2. app/api/orders/[orderId]/status/route.ts — the self-heal path,
 *      triggered when the confirmation page has been polling a
 *      "pending" order for too long and the webhook may simply never
 *      have arrived (network hiccup between PayMongo and us).
 * Both must clear the cart at the SAME moment (confirmed PAID), never
 * earlier — the previous implementation cleared the cart the instant
 * the Checkout Session was created (app/api/checkout/route.ts), which
 * meant a buyer whose connection died mid-payment lost their cart
 * contents with no way back if the payment never completed.
 *
 * CART IDENTITY:
 * Order.userId is used when present (signed-in buyer). Otherwise
 * Order.cartToken (captured at Order-creation time in
 * app/api/checkout/route.ts) identifies the guest cart — never a
 * value read back from the current request, since the webhook call
 * comes from PayMongo's servers and carries no buyer cookies at all.
 */
import { prisma } from "@/services/prisma";

export interface MarkOrderPaidInput {
  orderId: string;
  userId: string | null;
  cartToken: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  paidAt: Date;
}

/**
 * markOrderPaid
 * Idempotent by design: if the Order is already "PAID" (e.g. the
 * webhook already ran before the self-heal poll checked in), this
 * still safely re-applies the same field values and clears an
 * already-empty cart — never throws on a duplicate confirmation.
 */
export async function markOrderPaid({
  orderId,
  userId,
  cartToken,
  paymentId,
  paymentStatus,
  paidAt,
}: MarkOrderPaidInput): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymongoPaymentId: paymentId,
      paymentStatus: paymentStatus ?? "paid",
      paidAt,
    },
  });

  // Only now — confirmed PAID — is it safe to clear the cart that
  // produced this Order (Gap A fix).
  if (userId) {
    await prisma.cartItem.deleteMany({ where: { userId } });
  } else if (cartToken) {
    await prisma.cartItem.deleteMany({ where: { cartToken } });
  }
}

export interface MarkOrderFailedInput {
  orderId: string;
  paymentStatus: string | null;
}

/**
 * markOrderFailed
 * Flips Order.status to "FAILED" when PayMongo reports the checkout
 * session itself failed or expired (webhook's
 * checkout_session.payment.failed event, or the self-heal status
 * route finding an expired session that was never paid). Unlike
 * markOrderPaid(), this deliberately never touches the cart — the
 * whole point of a FAILED order is that the buyer can retry the SAME
 * order via app/api/orders/[orderId]/retry-payment/route.ts without
 * losing their line items or having to rebuild the cart from
 * scratch. Idempotent — re-applying to an already-FAILED Order is
 * harmless.
 */
export async function markOrderFailed({ orderId, paymentStatus }: MarkOrderFailedInput): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "FAILED",
      paymentStatus: paymentStatus ?? "failed",
    },
  });
}
