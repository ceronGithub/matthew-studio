/**
 * FILE: services/paymongo.ts
 * PURPOSE:
 * Creates a PayMongo Checkout Session server-side with the
 * server-validated order total — never a client-submitted amount
 * (cart_checkout_specification.md Section 4.3). This app never
 * collects raw card numbers itself; PayMongo's hosted checkout page
 * handles that entirely (Rule 6.6 / PCI scope reduction).
 *
 * PRODUCT CHOICE: Checkout Session (`/v1/checkout_sessions`), not the
 * older Payment Links product (`/v1/links`) — the spec left this open
 * ("Payment Link (or Checkout Session, whichever fits)"). Checkout
 * Sessions support `success_url`/`cancel_url` so PayMongo can redirect
 * the buyer straight back to our own order-confirmation page, and
 * itemized `line_items` so the buyer sees the same cart breakdown on
 * PayMongo's page that they saw on ours. Payment Links have neither —
 * the buyer would have to navigate back manually, which is worse UX
 * for zero benefit here.
 *
 * `Order.paymongoOrderId` (named for the older Payment Link product)
 * stores this Checkout Session's id (`cs_...`) instead — same field,
 * same purpose (the id the webhook looks up the Order by), just a
 * different PayMongo product behind it.
 *
 * SECURITY (Rule 18.5):
 * PAYMONGO_SECRET_KEY is a server-only env var — no NEXT_PUBLIC_
 * prefix, never sent to the client. PayMongo's API authenticates via
 * HTTP Basic Auth with the secret key as the username and an empty
 * password.
 */
const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

export interface CheckoutSessionResult {
  checkoutSessionId: string;
  checkoutUrl: string;
}

/**
 * CheckoutLineItemInput
 * The only shape createCheckoutSession actually needs from a "line
 * item", regardless of where it came from. Deliberately narrower than
 * lib/cartPricing.ts's CartLineItem (which carries catalog/display
 * fields this function never reads) so a second caller can build
 * this from a different source without importing cart-specific
 * types. Two producers today:
 *   1. app/api/checkout/route.ts — maps from live CartLineItem rows
 *      (structurally compatible, no explicit conversion needed).
 *   2. app/api/orders/[orderId]/retry-payment/route.ts — maps from
 *      the Order's own OrderItem snapshots (nameSnapshot/
 *      priceSnapshot), since a FAILED order's cart may no longer
 *      exist or may have changed since checkout.
 */
export interface CheckoutLineItemInput {
  name: string;
  unitPrice: number;
  variant: string | null;
  quantity: number;
}

interface CreateCheckoutSessionParams {
  items: CheckoutLineItemInput[];
  shippingFee: number;
  requiresShipping: boolean;
  email: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * pesosToCentavos
 * PayMongo amounts are always integer centavos (₱1.00 = 100). Rounds
 * rather than truncates so a fractional-peso price (shouldn't happen
 * today, but guards against future decimal pricing) never silently
 * undercharges by a centavo.
 */
function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * createCheckoutSession
 * Builds one line item per cart line (plus a separate "Shipping fee"
 * line when the cart requires shipping — PayMongo Checkout Sessions
 * have no dedicated shipping field, so it's just another line item),
 * and points success/cancel back at this app's own routes.
 *
 * Throws on any non-2xx response or network failure — the caller
 * (app/api/checkout/route.ts) is responsible for cleaning up the
 * pending Order it already created if this throws, since a Checkout
 * Session that was never actually created has nothing for the
 * webhook to ever confirm.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const lineItems = params.items.map((item) => ({
    currency: "PHP",
    amount: pesosToCentavos(item.unitPrice),
    name: item.name,
    description: item.variant ?? undefined,
    quantity: item.quantity,
  }));

  if (params.requiresShipping && params.shippingFee > 0) {
    lineItems.push({
      currency: "PHP",
      amount: pesosToCentavos(params.shippingFee),
      name: "Shipping fee",
      description: undefined,
      quantity: 1,
    });
  }

  const billing: Record<string, unknown> = { email: params.email };
  if (params.shippingName) billing.name = params.shippingName;
  if (params.shippingPhone) billing.phone = params.shippingPhone;
  if (params.shippingAddress) {
    // PayMongo's billing.address only has a single free-text `line1` —
    // this app collects shipping address as one field (Section 4.2),
    // so it maps directly with no further splitting needed.
    billing.address = { line1: params.shippingAddress };
  }

  const response = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // HTTP Basic Auth: secret key as username, empty password —
      // PayMongo's documented auth scheme for server-side API calls.
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing,
          line_items: lineItems,
          payment_method_types: ["card", "gcash", "paymaya", "grab_pay"],
          description: `Matthew Studio order ${params.orderId}`,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          // Ties the session back to our own Order row in PayMongo's
          // dashboard/logs — not read back programmatically anywhere,
          // purely for manual support lookups.
          reference_number: params.orderId,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo checkout session creation failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const checkoutSessionId: string | undefined = payload?.data?.id;
  const checkoutUrl: string | undefined = payload?.data?.attributes?.checkout_url;

  if (!checkoutSessionId || !checkoutUrl) {
    throw new Error("PayMongo response missing checkout session id or checkout_url.");
  }

  return { checkoutSessionId, checkoutUrl };
}

/**
 * PaymongoPayment / PaymongoCheckoutSessionPayments
 * Minimal shape of the fields this app actually reads from a
 * PayMongo Checkout Session's nested `payments` array — the same
 * shape the webhook route parses from the event payload (Rule 30.2),
 * reused here for the self-heal direct-query path.
 */
interface PaymongoPayment {
  id?: string;
  attributes?: {
    status?: string;
    paid_at?: number;
  };
}

export interface CheckoutSessionPaymentDetails {
  paymentId: string | null;
  paymentStatus: string | null;
  paidAt: Date | null;
  isPaid: boolean;
  /** True when PayMongo reports the payment attempt itself as
   * "failed" (declined card, buyer cancelled, etc.) — distinct from
   * isExpired, which is about the Checkout Session's own lifetime. */
  isFailed: boolean;
}

/**
 * extractPaymentDetails
 * Rule 30.2's exact extraction pattern, factored out so both the
 * webhook (parsing a pushed event) and getCheckoutSession (parsing a
 * pulled API response — same nested `data.attributes.payments`
 * shape) never implement this twice. isFailed covers the
 * checkout_session.payment.failed webhook event and any self-heal
 * lookup that finds a payment attempt PayMongo marked "failed" —
 * "unpaid" (no attempt made yet) is neither paid nor failed.
 */
export function extractPaymentDetails(payments: PaymongoPayment[] | undefined): CheckoutSessionPaymentDetails {
  const payment = payments?.[0];
  const paymentStatus = payment?.attributes?.status ?? null;
  return {
    paymentId: payment?.id ?? null,
    paymentStatus,
    paidAt: payment?.attributes?.paid_at ? new Date(payment.attributes.paid_at * 1000) : null,
    isPaid: paymentStatus === "paid",
    isFailed: paymentStatus === "failed",
  };
}

export interface CheckoutSessionLookupResult extends CheckoutSessionPaymentDetails {
  /** True when PayMongo's own session-level status is "expired" —
   * the buyer never completed (or abandoned) checkout before the
   * session's lifetime ran out. Distinct from isFailed (a payment
   * attempt was made and declined). Self-heal treats both the same
   * way: mark the Order FAILED so the buyer can retry. */
  isExpired: boolean;
}

/**
 * getCheckoutSession
 * Self-heal path only (Gap B fix, cart_checkout_specification.md
 * Section 4.3 KNOWN GAP) — directly asks PayMongo for a Checkout
 * Session's current state when a webhook may never have arrived.
 * Never called from the normal payment-confirmation flow, which
 * relies exclusively on the webhook per Rule 30.3.
 */
export async function getCheckoutSession(checkoutSessionId: string): Promise<CheckoutSessionLookupResult> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions/${checkoutSessionId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo checkout session lookup failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const payments: PaymongoPayment[] | undefined = payload?.data?.attributes?.payments;
  const sessionStatus: string | undefined = payload?.data?.attributes?.status;

  return {
    ...extractPaymentDetails(payments),
    isExpired: sessionStatus === "expired",
  };
}
