/**
 * FILE: components/checkout/PromoCodeField.tsx
 * ROLE: Public — "Have a promo code?" box inside the checkout order summary.
 *
 * PURPOSE:
 * Lets a buyer or guest try a promo code before paying. Apply sends ONLY the
 * typed code to POST /api/checkout/validate-coupon, which works out the
 * discount, shipping and total on the server from the real cart. This
 * component never calculates a discount itself and never sends a total
 * anywhere — it just hands the server's answer up to CheckoutForm, which
 * shows it. The real price is decided again by POST /api/checkout when the
 * order is created (task-54d).
 *
 * DATA FLOW:
 * 1. Buyer opens the box, types a code (forbidden characters are stripped
 *    as they type — Rule 18.1) and presses Apply or Enter.
 * 2. fetch() calls validate-coupon with the CSRF header (Rule 32.2).
 * 3. Success -> onApplied(server data) + success toast; this component then
 *    shows the applied code with a Remove button instead of the input.
 * 4. Failure -> error toast with the server's message; totals stay unchanged.
 * 5. Remove -> onRemoved(); CheckoutForm goes back to the original totals.
 */
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { getCsrfHeader } from "@/lib/csrf";
import type { ToastType } from "@/components/shared/useToast";
import type { ValidateCouponData } from "@/app/api/checkout/validate-coupon/route";

interface ValidateCouponResponse {
  success: boolean;
  data: ValidateCouponData | null;
  message: string;
}

interface PromoCodeFieldProps {
  /** The coupon the server accepted, or null when none is applied. */
  appliedCoupon: ValidateCouponData | null;
  /** Called with the server's answer after a code is accepted. */
  onApplied: (coupon: ValidateCouponData) => void;
  /** Called when the buyer removes the applied code. */
  onRemoved: () => void;
  /** Toast function owned by CheckoutForm (single useToast instance, Rule 22.4). */
  showToast: (message: string, type: ToastType) => void;
}

// Rule 18.1 forbidden characters — stripped silently as the buyer types.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"` =-]/g;

export default function PromoCodeField({ appliedCoupon, onApplied, onRemoved, showToast }: PromoCodeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  /**
   * handleCodeChange
   * Strips forbidden characters and upper-cases the text, because the server
   * stores and matches codes in upper-case anyway.
   */
  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setCodeInput(event.target.value.replace(FORBIDDEN_CHARACTERS, "").toUpperCase());
  }

  /**
   * handleApply
   * Sends the typed code to the server for checking. Disabled while a check
   * is running so a double click can't fire two requests (Rule 34.3).
   */
  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isApplying) return;

    if (!codeInput) {
      showToast("✕ Enter a promo code first, then try again.", "error");
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        // Only the code is sent — the server rebuilds the cart and the price.
        body: JSON.stringify({ code: codeInput }),
      });
      const payload: ValidateCouponResponse = await response.json();

      if (!payload.success || !payload.data) {
        showToast(`✕ ${payload.message || "We couldn't check that promo code. Please try again."}`, "error");
        return;
      }

      onApplied(payload.data);
      setCodeInput("");
      showToast(`✓ ${payload.message}`, "success");
    } catch {
      showToast("✕ We couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsApplying(false);
    }
  }

  /**
   * handleRemove
   * Drops the applied code so CheckoutForm shows the original totals again.
   */
  function handleRemove() {
    onRemoved();
    showToast("✓ Promo code removed.", "success");
  }

  if (appliedCoupon) {
    return (
      <div className="promoCodeApplied">
        <div className="promoCodeAppliedInfo">
          <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
          <p>
            <span className="promoCodeAppliedCode">{appliedCoupon.couponCode}</span>{" "}
            {appliedCoupon.freeShipping
              ? "— free shipping"
              : `— ₱${appliedCoupon.discountAmount.toLocaleString("en-PH")} off`}
          </p>
        </div>
        <button type="button" className="promoCodeRemoveButton" onClick={handleRemove}>
          <X size={14} strokeWidth={2} aria-hidden="true" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="promoCode">
      <button
        type="button"
        className="promoCodeToggle"
        aria-expanded={isOpen}
        aria-controls="promoCodeForm"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      >
        <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
        Have a promo code?
      </button>

      {isOpen && (
        <form id="promoCodeForm" className="promoCodeForm" noValidate onSubmit={handleApply}>
          <input
            type="text"
            className="promoCodeInput"
            aria-label="Promo code"
            autoFocus
            autoComplete="off"
            maxLength={64}
            value={codeInput}
            onChange={handleCodeChange}
          />
          <button type="submit" className="buttonSecondary promoCodeApplyButton" disabled={isApplying}>
            {isApplying ? (
              <>
                <Loader2 size={16} strokeWidth={2} className="checkoutSpinner" aria-hidden="true" />
                Applying…
              </>
            ) : (
              "Apply"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
