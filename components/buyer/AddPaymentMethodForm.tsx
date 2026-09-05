/**
 * FILE: components/buyer/AddPaymentMethodForm.tsx
 * ROLE: Buyer only — rendered inside PaymentMethodsList.tsx.
 *
 * PURPOSE:
 * Collects card number/expiry/cvc and drives the full add-card flow:
 * open a hold (useBuyerPaymentMethods.addStart) -> tokenize the card
 * with PayMongo's publishable key (lib/paymongoClient.ts) -> attach
 * it to the hold -> if 3D Secure is required, redirect the browser to
 * PayMongo (PaymentMethodsList picks the flow back up on return via
 * the ?intent= query param); otherwise finalize immediately.
 *
 * Card digits never touch this app's own API — they go straight from
 * this form to PayMongo's API via lib/paymongoClient.ts (Rule 6.6).
 * Fields are digit-only by construction (stripped on every keystroke)
 * rather than Rule 18.1's generic forbidden-character filter, which
 * targets a different threat model (HTML/script injection) than a
 * numeric card field needs.
 */
"use client";

import { useState, type FormEvent } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { useBuyerPaymentMethods } from "@/lib/hooks/useBuyerPaymentMethods";
import { createCardPaymentMethod, attachPaymentMethodToIntent } from "@/lib/paymongoClient";

interface AddPaymentMethodFormProps {
  addStart: ReturnType<typeof useBuyerPaymentMethods>["addStart"];
  addFinalize: ReturnType<typeof useBuyerPaymentMethods>["addFinalize"];
  onDone: (result: { success: boolean; message: string }) => void;
  onCancel: () => void;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCardNumberDisplay(value: string): string {
  return value.replace(/(.{4})/g, "$1 ").trim();
}

export default function AddPaymentMethodForm({
  addStart,
  addFinalize,
  onDone,
  onCancel,
}: AddPaymentMethodFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MM/YY, digits only underneath
  const [cvc, setCvc] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleExpiryChange(raw: string) {
    const digits = digitsOnly(raw).slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const cleanCardNumber = digitsOnly(cardNumber);
    const [expMonthRaw, expYearRaw] = expiry.split("/");
    const expMonth = Number(expMonthRaw);
    const expYear = expYearRaw ? Number(`20${expYearRaw}`) : NaN;

    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setFieldError("Enter a valid card number.");
      return;
    }
    if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
      setFieldError("Enter a valid expiry date (MM/YY).");
      return;
    }
    if (cvc.length < 3) {
      setFieldError("Enter your card's 3 or 4-digit security code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const started = await addStart();
      if (!started.success || !started.paymentIntentId || !started.clientKey) {
        onDone({ success: false, message: started.message || "We couldn't start adding that card." });
        return;
      }

      const paymentMethodId = await createCardPaymentMethod({
        cardNumber: cleanCardNumber,
        expMonth,
        expYear,
        cvc,
      });

      const returnUrl = `${window.location.origin}/buyer/payment-methods?intent=${started.paymentIntentId}`;
      const attachResult = await attachPaymentMethodToIntent(
        started.paymentIntentId,
        started.clientKey,
        paymentMethodId,
        returnUrl
      );

      if (!attachResult.isReadyToFinalize && attachResult.nextActionUrl) {
        // Hand the browser to PayMongo for 3D Secure — it redirects
        // back to returnUrl above, which PaymentMethodsList picks up
        // on mount via the ?intent= query param.
        window.location.href = attachResult.nextActionUrl;
        return;
      }

      const finalizeResult = await addFinalize(started.paymentIntentId);
      onDone(
        finalizeResult.success
          ? { success: true, message: "✓ Payment method added." }
          : { success: false, message: finalizeResult.message }
      );
    } catch (error) {
      onDone({
        success: false,
        message: error instanceof Error ? error.message : "We couldn't add that card. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="addPaymentMethodForm" onSubmit={handleSubmit}>
      <p className="addPaymentMethodLegend">* Required fields</p>

      <label className="addPaymentMethodLabel" htmlFor="cardNumber">
        Card number <span aria-hidden="true">*</span>
      </label>
      <input
        id="cardNumber"
        className="addPaymentMethodInput"
        type="tel"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4343 4343 4343 4345"
        maxLength={23}
        autoFocus
        value={formatCardNumberDisplay(digitsOnly(cardNumber))}
        onChange={(event) => setCardNumber(digitsOnly(event.target.value).slice(0, 19))}
      />

      <div className="addPaymentMethodRow">
        <div className="addPaymentMethodField">
          <label className="addPaymentMethodLabel" htmlFor="cardExpiry">
            Expiry (MM/YY) <span aria-hidden="true">*</span>
          </label>
          <input
            id="cardExpiry"
            className="addPaymentMethodInput"
            type="tel"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/28"
            maxLength={5}
            value={expiry}
            onChange={(event) => handleExpiryChange(event.target.value)}
          />
        </div>

        <div className="addPaymentMethodField">
          <label className="addPaymentMethodLabel" htmlFor="cardCvc">
            CVC <span aria-hidden="true">*</span>
          </label>
          <input
            id="cardCvc"
            className="addPaymentMethodInput"
            type="tel"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={cvc}
            onChange={(event) => setCvc(digitsOnly(event.target.value).slice(0, 4))}
          />
        </div>
      </div>

      {fieldError && (
        <span className="addPaymentMethodError" role="alert">
          {fieldError}
        </span>
      )}

      <div className="addPaymentMethodActions">
        <button
          type="button"
          className="addPaymentMethodCancelButton"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="addPaymentMethodSubmitButton" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="buyerSpin" /> Saving…
            </>
          ) : (
            <>
              <CreditCard size={16} /> Save card
            </>
          )}
        </button>
      </div>
    </form>
  );
}
