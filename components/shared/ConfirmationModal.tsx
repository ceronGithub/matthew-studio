/**
 * FILE: components/shared/ConfirmationModal.tsx
 * PURPOSE:
 * Shared confirmation modal for every destructive/irreversible action
 * across the app (Rule 34.4) — starting here with the buyer's Cancel
 * Order action (buyer_order_tracking_specification.md Section 3.2).
 * Reuse this component for any future delete/ban/cancel action rather
 * than building a one-off modal per feature.
 *
 * Shows a loading state on the confirm button while the action runs
 * and never auto-closes until the caller's onConfirm promise settles.
 *
 * Optional confirmDelaySeconds (added for task-96, Section 3.2.1's
 * "Delete — confirmation modal with 5-second delay"): when provided,
 * the confirm button stays disabled and counts down until the delay
 * elapses, so an admin can't reflexively click through a permanent
 * delete. Omitted entirely by every other caller — default behavior
 * (button enabled immediately) is unchanged.
 */
"use client";

import { useEffect, useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  confirmDelaySeconds?: number;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmDelaySeconds,
}: ConfirmationModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(confirmDelaySeconds ?? 0);

  // Restart the countdown every time the modal opens — never carry a
  // stale countdown over from a previous open of the same instance.
  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(confirmDelaySeconds ?? 0);
    if (!confirmDelaySeconds) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isOpen, confirmDelaySeconds]);

  if (!isOpen) return null;

  const isCountingDown = Boolean(confirmDelaySeconds) && secondsRemaining > 0;

  async function handleConfirm() {
    setIsExecuting(true);
    await onConfirm();
    setIsExecuting(false);
  }

  return (
    <div className="confirmationModalBackdrop" role="dialog" aria-modal="true">
      <div className="confirmationModalDialog">
        <h2 className="confirmationModalTitle">{title}</h2>
        <p className="confirmationModalDescription">{description}</p>
        <div className="confirmationModalActions">
          <button type="button" className="confirmationModalCancelButton" onClick={onCancel} disabled={isExecuting}>
            Cancel
          </button>
          <button
            type="button"
            className="confirmationModalConfirmButton"
            onClick={handleConfirm}
            disabled={isExecuting || isCountingDown}
          >
            {isExecuting ? "Processing…" : isCountingDown ? `${confirmLabel} (${secondsRemaining})` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
