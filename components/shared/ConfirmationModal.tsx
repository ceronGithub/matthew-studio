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
 */
"use client";

import { useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

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
            disabled={isExecuting}
          >
            {isExecuting ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
