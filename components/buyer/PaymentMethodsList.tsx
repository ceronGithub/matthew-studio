/**
 * FILE: components/buyer/PaymentMethodsList.tsx
 * ROLE: Buyer only — rendered inside app/buyer/payment-methods/page.tsx.
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.3. Lists saved cards
 * (masked label, default badge), lets the buyer add a new one
 * (AddPaymentMethodForm), remove one (behind the shared
 * ConfirmationModal per Rule 34.4), and set a default. Handles all
 * three required data states (Rule 25): loading skeleton, empty
 * state, and error state with retry.
 *
 * 3D-Secure return handling: if the buyer just came back from
 * PayMongo's 3DS challenge, the URL carries ?intent=<paymentIntentId>
 * (set as the return_url in AddPaymentMethodForm). On mount, this
 * component detects that param, calls addFinalize to complete the
 * save, shows the toast, and strips the param from the URL so a page
 * refresh never re-triggers it.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Star, Trash2, Plus } from "lucide-react";
import { useBuyerPaymentMethods } from "@/lib/hooks/useBuyerPaymentMethods";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import AddPaymentMethodForm from "@/components/buyer/AddPaymentMethodForm";

export default function PaymentMethodsList() {
  const {
    methods,
    isLoading,
    error,
    refetch,
    addStart,
    addFinalize,
    removeMethod,
    setDefaultMethod,
  } = useBuyerPaymentMethods();
  const { toasts, showToast, dismissToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [isFinalizingReturn, setIsFinalizingReturn] = useState(false);

  // Picks up the flow after a 3D Secure redirect back from PayMongo
  // (AddPaymentMethodForm's return_url) — runs once per intent param.
  useEffect(() => {
    const intentId = searchParams.get("intent");
    if (!intentId) return;

    setIsFinalizingReturn(true);
    addFinalize(intentId).then((result) => {
      showToast(result.success ? "✓ Payment method added." : `✕ ${result.message}`, result.success ? "success" : "error");
      setIsFinalizingReturn(false);
      router.replace("/buyer/payment-methods");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleAddDone(result: { success: boolean; message: string }) {
    setIsAddingMethod(false);
    showToast(result.success ? result.message : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleRemoveConfirm() {
    if (!pendingRemoveId) return;
    const result = await removeMethod(pendingRemoveId);
    setPendingRemoveId(null);
    showToast(result.success ? "✓ Payment method removed." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleSetDefault(id: string) {
    const result = await setDefaultMethod(id);
    if (!result.success) showToast(`✕ ${result.message}`, "error");
  }

  const pendingRemoveMethod = methods.find((method) => method.id === pendingRemoveId) ?? null;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {(isLoading || isFinalizingReturn) && (
        <div className="paymentMethodsGrid">
          {[0, 1].map((index) => (
            <div key={index} className="paymentMethodCard paymentMethodCard--skeleton">
              <div className="paymentMethodSkeletonIcon skeletonBlock" />
              <div className="paymentMethodSkeletonLine skeletonBlock" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isFinalizingReturn && error && (
        <div className="paymentMethodsEmptyState">
          <CreditCard size={32} />
          <p>{error}</p>
          <button type="button" className="paymentMethodsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isFinalizingReturn && !error && methods.length === 0 && !isAddingMethod && (
        <div className="paymentMethodsEmptyState">
          <CreditCard size={32} />
          <p>No payment methods yet.</p>
          <button type="button" className="paymentMethodsRetryButton" onClick={() => setIsAddingMethod(true)}>
            <Plus size={16} /> Add payment method
          </button>
        </div>
      )}

      {!isLoading && !isFinalizingReturn && !error && (methods.length > 0 || isAddingMethod) && (
        <>
          <div className="paymentMethodsGrid">
            {methods.map((method) => (
              <div key={method.id} className="paymentMethodCard">
                <div className="paymentMethodIconWrapper">
                  <CreditCard size={22} />
                </div>

                <div className="paymentMethodCardBody">
                  <p className="paymentMethodLabel">{method.maskedLabel}</p>
                  {method.isDefault && (
                    <span className="paymentMethodDefaultBadge">
                      <Star size={12} /> Default
                    </span>
                  )}
                </div>

                <div className="paymentMethodCardActions">
                  {!method.isDefault && (
                    <button
                      type="button"
                      className="paymentMethodSetDefaultButton"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    className="paymentMethodRemoveButton"
                    onClick={() => setPendingRemoveId(method.id)}
                    aria-label={`Remove ${method.maskedLabel}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {isAddingMethod ? (
            <AddPaymentMethodForm addStart={addStart} addFinalize={addFinalize} onDone={handleAddDone} onCancel={() => setIsAddingMethod(false)} />
          ) : (
            <button type="button" className="paymentMethodsAddButton" onClick={() => setIsAddingMethod(true)}>
              <Plus size={16} /> Add payment method
            </button>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={pendingRemoveMethod !== null}
        title="Remove payment method?"
        description={`Are you sure you want to remove ${pendingRemoveMethod?.maskedLabel ?? "this card"}? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  );
}
