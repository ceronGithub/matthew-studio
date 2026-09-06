/**
 * FILE: components/gatekeeper/ManualBanModal.tsx
 * ROLE: Rendered only by components/gatekeeper/GatekeeperBansList.tsx.
 *
 * PURPOSE:
 * Section 5.2's manual-ban action: lets a super-admin ban a device
 * that hasn't yet crossed the automatic 3-strike threshold (e.g. a
 * suspicious pattern spotted on the Security Logs page, task-45).
 * Not a variant of the shared ConfirmationModal — this one collects
 * two text inputs before confirming, so it's its own small component
 * rather than stretching ConfirmationModal's single-description prop.
 */
"use client";

import { useState } from "react";

interface ManualBanModalProps {
  isOpen: boolean;
  onSubmit: (input: { deviceFingerprint: string; reason: string }) => Promise<void>;
  onCancel: () => void;
}

export default function ManualBanModal({ isOpen, onSubmit, onCancel }: ManualBanModalProps) {
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const canSubmit = deviceFingerprint.trim().length > 0 && reason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    await onSubmit({ deviceFingerprint: deviceFingerprint.trim(), reason: reason.trim() });
    setIsSubmitting(false);
    setDeviceFingerprint("");
    setReason("");
  }

  function handleCancel() {
    setDeviceFingerprint("");
    setReason("");
    onCancel();
  }

  return (
    <div className="gatekeeperModalBackdrop" role="dialog" aria-modal="true">
      <div className="gatekeeperModalDialog">
        <h2 className="gatekeeperModalTitle">Ban a device</h2>
        <p className="gatekeeperModalDescription">
          This device will be blocked from every request immediately (Section 8). Only a super-admin
          can lift it afterward.
        </p>

        <label className="gatekeeperModalLabel" htmlFor="manualBanFingerprint">
          Device fingerprint <span aria-hidden="true">*</span>
        </label>
        <input
          id="manualBanFingerprint"
          type="text"
          className="gatekeeperModalInput"
          value={deviceFingerprint}
          onChange={(event) => setDeviceFingerprint(event.target.value)}
          placeholder="SHA-256 fingerprint from a SecurityLog row"
          autoFocus
        />

        <label className="gatekeeperModalLabel" htmlFor="manualBanReason">
          Reason <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="manualBanReason"
          className="gatekeeperModalTextarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Repeated checkout fraud attempts flagged in Security Logs"
          rows={3}
        />

        <div className="gatekeeperModalActions">
          <button
            type="button"
            className="gatekeeperModalCancelButton"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="gatekeeperModalBanButton"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Banning…" : "Ban device"}
          </button>
        </div>
      </div>
    </div>
  );
}
