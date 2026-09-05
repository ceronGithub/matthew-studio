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
import { prisma } from "@/services/prisma";

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

/**
 * ── PAYMENT METHOD VAULTING (buyer_account_specification.md Section 4.3) ──
 *
 * PayMongo has no standalone hosted "save card" page — a card is only
 * vaulted as a byproduct of a real Payment Intent. This app uses the
 * "authorize-then-void" pattern confirmed with the developer
 * 2026-09-06: attach `setup_future_usage: "off_session"` to a tiny
 * (₱1) authorization, capture nothing, then immediately void the
 * intent. The card's payment_method is vaulted against the PayMongo
 * Customer regardless of the intent's own outcome.
 *
 * Card numbers are never touched by this app (Rule 6.6 / never_store)
 * — the actual card form is PayMongo's own hosted authorization
 * widget, this service only orchestrates the Customer + Payment
 * Intent calls around it.
 */

function paymongoAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

/**
 * getOrCreatePaymongoCustomer
 * Looks up the buyer's BuyerPaymentProfile row for an existing
 * PayMongo Customer id; creates one on PayMongo (and the local row)
 * on first use. One Customer per buyer, reused for every future
 * vaulted card.
 */
export async function getOrCreatePaymongoCustomer(
  userId: string,
  email: string
): Promise<string> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const existing = await prisma.buyerPaymentProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing.paymongoCustomerId;

  const response = await fetch(`${PAYMONGO_API_BASE}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: paymongoAuthHeader(secretKey),
    },
    body: JSON.stringify({
      data: { attributes: { email } },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo customer creation failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const paymongoCustomerId: string | undefined = payload?.data?.id;
  if (!paymongoCustomerId) {
    throw new Error("PayMongo response missing customer id.");
  }

  await prisma.buyerPaymentProfile.create({
    data: { userId, paymongoCustomerId },
  });

  return paymongoCustomerId;
}

export interface VaultingHoldResult {
  paymentIntentId: string;
  clientKey: string;
}

/**
 * createVaultingHold
 * Creates a ₱1 authorization Payment Intent with
 * `setup_future_usage: "off_session"` attached to the given Customer.
 * The returned clientKey is handed to PayMongo's hosted card form on
 * the client (Task 03) to collect and attach the card — this service
 * never sees the raw card number at any point.
 */
export async function createVaultingHold(
  paymongoCustomerId: string
): Promise<VaultingHoldResult> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: paymongoAuthHeader(secretKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: 100, // ₱1.00 — smallest allowed authorization, never captured
          currency: "PHP",
          capture_type: "manual", // authorize only; Task 02 voids instead of capturing
          payment_method_allowed: ["card"],
          setup_future_usage: "off_session",
          customer: paymongoCustomerId,
          description: "Card verification hold (not charged)",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo vaulting hold creation failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const paymentIntentId: string | undefined = payload?.data?.id;
  const clientKey: string | undefined = payload?.data?.attributes?.client_key;

  if (!paymentIntentId || !clientKey) {
    throw new Error("PayMongo response missing payment intent id or client_key.");
  }

  return { paymentIntentId, clientKey };
}

export interface VaultedPaymentMethodResult {
  paymongoPaymentMethodId: string;
  maskedLabel: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * getVaultedPaymentMethodFromHold
 * After the client has attached a card to the hold's Payment Intent
 * (Task 03's hosted card form step), reads back which payment_method
 * got vaulted and builds the display-safe masked label (e.g. "Visa
 * •••• 4417") — this app stores only this label plus PayMongo's own
 * reference id, never the card number itself (Rule 6.6).
 */
export async function getVaultedPaymentMethodFromHold(
  paymentIntentId: string
): Promise<VaultedPaymentMethodResult> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}`, {
    method: "GET",
    headers: { Authorization: paymongoAuthHeader(secretKey) },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo payment intent lookup failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const paymentMethodId: string | undefined = payload?.data?.attributes?.payment_method;
  const details = payload?.data?.attributes?.payment_method_details?.card;

  if (!paymentMethodId) {
    throw new Error("Payment intent has no attached payment method yet.");
  }

  const brand: string = details?.brand ? capitalize(details.brand) : "Card";
  const last4: string = details?.last4 ?? "????";

  return {
    paymongoPaymentMethodId: paymentMethodId,
    maskedLabel: `${brand} •••• ${last4}`,
  };
}

/**
 * voidVaultingHold
 * Cancels the authorization Payment Intent after the card is
 * confirmed vaulted (Task 02 calls this immediately after
 * getVaultedPaymentMethodFromHold succeeds) — the buyer is never
 * actually charged the ₱1.
 */
export async function voidVaultingHold(paymentIntentId: string): Promise<void> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: paymongoAuthHeader(secretKey),
    },
    body: JSON.stringify({ data: { attributes: {} } }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    // Non-fatal to the buyer's flow (the card is already vaulted by
    // this point) but must not be silently swallowed — surfaces in
    // logs so a stuck hold can be investigated.
    console.error(`[paymongo] Failed to void hold ${paymentIntentId} (${response.status}): ${errorBody}`);
  }
}

/**
 * detachPaymongoPaymentMethod
 * Detaches a vaulted payment method from its Customer on PayMongo's
 * side. Called by Task 02's DELETE route before removing the local
 * SavedPaymentMethod row — keeps PayMongo and this app's DB in sync.
 */
export async function detachPaymongoPaymentMethod(paymentMethodId: string): Promise<void> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `${PAYMONGO_API_BASE}/payment_methods/${paymentMethodId}/detach`,
    {
      method: "POST",
      headers: { Authorization: paymongoAuthHeader(secretKey) },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`PayMongo payment method detach failed (${response.status}): ${errorBody}`);
  }
}