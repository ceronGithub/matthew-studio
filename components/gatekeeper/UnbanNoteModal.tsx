/**
 * FILE: components/gatekeeper/UnbanNoteModal.tsx
 * ROLE: Rendered only by components/gatekeeper/GatekeeperBansList.tsx.
 *
 * PURPOSE:
 * The note-input variant of the shared ConfirmationModal that task-33
 * flagged as missing — components/shared/ConfirmationModal.tsx has no
 * text-input slot, and Section 8 requires a non-empty unbanNote before
 * any ban is lifted (the API route already rejects an empty note with
 * 400; this mirrors that requirement client-side so the button stays
 * disabled until a note is entered, rather than round-tripping to find
 * out).
 */
"use client";

import { useState } from "react";

interface UnbanNoteModalProps {
  isOpen: boolean;
  deviceFingerprint: string;
  onConfirm: (unbanNote: string) => Promise<void>;
  onCancel: () => void;
}

export default function UnbanNoteModal({ isOpen, deviceFingerprint, onConfirm, onCancel }: UnbanNoteModalProps) {
  const [unbanNote, setUnbanNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const canSubmit = unbanNote.trim().length > 0;

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    await onConfirm(unbanNote.trim());
    setIsSubmitting(false);
    setUnbanNote("");
  }

  function handleCancel() {
    setUnbanNote("");
    onCancel();
  }

  return (
    <div className="gatekeeperModalBackdrop" role="dialog" aria-modal="true">
      <div className="gatekeeperModalDialog">
        <h2 className="gatekeeperModalTitle">Unban this device?</h2>
        <p className="gatekeeperModalDescription">
          Lifting the ban on <strong>{deviceFingerprint}</strong> restores its access immediately.
          A note explaining why is required (Section 8).
        </p>

        <label className="gatekeeperModalLabel" htmlFor="unbanNote">
          Unban note <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="unbanNote"
          className="gatekeeperModalTextarea"
          value={unbanNote}
          onChange={(event) => setUnbanNote(event.target.value)}
          placeholder="e.g. Confirmed with the customer, false positive from a shared office IP"
          rows={3}
          autoFocus
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
            className="gatekeeperModalUnbanButton"
            onClick={handleConfirm}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Processing…" : "Unban device"}
          </button>
        </div>
      </div>
    </div>
  );
}
