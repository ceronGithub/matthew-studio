/**
 * FILE: lib/paymongoClient.ts
 * PURPOSE:
 * Browser-only PayMongo API calls for the Add Payment Method flow
 * (buyer_account_specification.md Section 4.3). This app never
 * collects a card number on its own form and submits it to *our*
 * backend (Rule 6.6 / never_store) — instead this file talks
 * directly to PayMongo's API from the browser using the PUBLISHABLE
 * key, which is safe to expose client-side (Rule 18.5/31.8, same as
 * NEXT_PUBLIC_SUPABASE_ANON_KEY's threat model). Our own server
 * (services/paymongo.ts) never sees the raw card number at any point
 * — only the resulting payment_method reference.
 *
 * Two-call PayMongo flow used here, per their documented Payment
 * Intent workflow:
 *   1. createCardPaymentMethod — tokenizes the raw card into a
 *      payment_method id.
 *   2. attachPaymentMethodToIntent — attaches that payment_method to
 *      the server-created hold (services/paymongo.ts's
 *      createVaultingHold) using the intent's client_key. May come
 *      back requiring 3D Secure, in which case the caller must
 *      redirect the browser to next_action_url and let PayMongo
 *      redirect back to returnUrl afterward.
 */
"use client";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

function publicAuthHeader(): string {
  const publicKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Payments aren't configured yet. Please try again later.");
  }
  return `Basic ${btoa(`${publicKey}:`)}`;
}

export interface CardDetailsInput {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

/**
 * createCardPaymentMethod
 * Tokenizes the card the buyer just typed into our own form fields
 * (Task 03's AddPaymentMethodForm) by sending it straight to
 * PayMongo's API with the publishable key — this app's backend never
 * sees these digits. Card number/expiry/cvc are digit-only by the
 * time they reach here (the form strips everything else on input).
 */
export async function createCardPaymentMethod(card: CardDetailsInput): Promise<string> {
  const response = await fetch(`${PAYMONGO_API_BASE}/payment_methods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: publicAuthHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          type: "card",
          details: {
            card_number: card.cardNumber,
            exp_month: card.expMonth,
            exp_year: card.expYear,
            cvc: card.cvc,
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message: string | undefined = payload?.errors?.[0]?.detail;
    throw new Error(message ?? "We couldn't verify that card. Please check the details and try again.");
  }

  const paymentMethodId: string | undefined = payload?.data?.id;
  if (!paymentMethodId) {
    throw new Error("We couldn't verify that card. Please check the details and try again.");
  }

  return paymentMethodId;
}

export interface AttachResult {
  /** true once the card is attached and no further buyer action is needed. */
  isReadyToFinalize: boolean;
  /** Present only when PayMongo requires 3D Secure authentication —
   * the caller must send the browser here next. */
  nextActionUrl: string | null;
}

/**
 * attachPaymentMethodToIntent
 * Attaches the tokenized card to the server-created vaulting hold
 * using its client_key (safe to use client-side — it's scoped to
 * this one Payment Intent only, unlike the secret key). Returns
 * whether 3D Secure is required so the caller knows whether to
 * redirect or finalize immediately.
 */
export async function attachPaymentMethodToIntent(
  paymentIntentId: string,
  clientKey: string,
  paymentMethodId: string,
  returnUrl: string
): Promise<AttachResult> {
  const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}/attach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: publicAuthHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
          return_url: returnUrl,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message: string | undefined = payload?.errors?.[0]?.detail;
    throw new Error(message ?? "We couldn't save that card. Please try again.");
  }

  const status: string | undefined = payload?.data?.attributes?.status;
  const nextActionUrl: string | undefined =
    payload?.data?.attributes?.next_action?.redirect?.url;

  if (status === "awaiting_next_action" && nextActionUrl) {
    return { isReadyToFinalize: false, nextActionUrl };
  }

  return { isReadyToFinalize: true, nextActionUrl: null };
}
