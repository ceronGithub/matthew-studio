/**
 * FILE: components/admin/ProductionStageTracker.tsx
 * ROLE: Admin/super-admin only — embedded in AdminOrderDetail.tsx
 * (task-81's page), rendered only for `tshirts`-category orders
 * (order.hasTshirtItem).
 *
 * PURPOSE:
 * task-82, admin_account_specification.md Section 3.3.3 — T-Shirt
 * Production Tracking. Horizontal 6-stage stepper (design_review →
 * design_approved → printing → quality_check → packed → shipped),
 * wired to task-79's PATCH .../production-stage route via task-81's
 * useAdminOrderDetail hook. Reverting a stage requires a note and
 * goes behind the shared ConfirmationModal (Rule 34.4) — advancing
 * does not, since it's the expected forward path. A proof photo can
 * be attached only when the TARGET stage is Quality Check or Packed,
 * matching the API's own restriction.
 *
 * Direction (advance vs revert) is computed here from STAGE_ORDER
 * purely to decide the UI gate (show the modal / require the note
 * field) — the server independently recomputes it from the DB's
 * actual current stage before writing (Rule 6: never trust a
 * client-supplied direction), so this component's guess can't be
 * used to bypass that check.
 */
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ImagePlus, Loader2 } from "lucide-react";
import { PRODUCTION_STAGE_LABELS } from "@/lib/orderStatus";
import type { ProductionStageHistoryEntry } from "@/lib/hooks/useAdminOrderDetail";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const STAGE_ORDER = Object.keys(PRODUCTION_STAGE_LABELS);
const PHOTO_ALLOWED_STAGES = ["quality_check", "packed"];

interface ProductionStageTrackerProps {
  currentStage: string | null;
  history: ProductionStageHistoryEntry[];
  isUpdating: boolean;
  onUpdate: (stage: string, note: string, photo: File | null, isRevert: boolean) => Promise<{ success: boolean; message: string }>;
  onResult: (success: boolean, message: string) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProductionStageTracker({
  currentStage,
  history,
  isUpdating,
  onUpdate,
  onResult,
}: ProductionStageTrackerProps) {
  const currentIndex = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;

  const [targetStage, setTargetStage] = useState(STAGE_ORDER[0]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);

  const targetIndex = STAGE_ORDER.indexOf(targetStage);
  const isRevert = targetIndex < currentIndex;
  const photoAllowed = PHOTO_ALLOWED_STAGES.includes(targetStage);

  async function submit() {
    const result = await onUpdate(targetStage, note, photoAllowed ? photo : null, isRevert);
    setIsRevertModalOpen(false);
    if (result.success) {
      setNote("");
      setPhoto(null);
    }
    onResult(result.success, result.message);
  }

  function handleSubmitClick() {
    if (isRevert && !note.trim()) {
      onResult(false, "Please explain why you're reverting this stage before saving.");
      return;
    }
    if (isRevert) {
      setIsRevertModalOpen(true);
      return;
    }
    submit();
  }

  return (
    <section className="productionTrackerSection">
      <h2 className="adminOrderDetailSectionTitle">Production tracker</h2>

      <div className="productionTrackerStepper">
        {STAGE_ORDER.map((stage, index) => {
          const isDone = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={stage}
              className={`productionTrackerStep${isCurrent ? " productionTrackerStep--current" : ""}`}
            >
              {isDone ? (
                <CheckCircle2 size={18} className="productionTrackerStepIcon productionTrackerStepIcon--done" />
              ) : (
                <Circle size={18} className="productionTrackerStepIcon" />
              )}
              <span className="productionTrackerStepLabel">{PRODUCTION_STAGE_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>

      <div className="productionTrackerForm">
        <select
          className="adminOrderDetailSelect"
          value={targetStage}
          onChange={(e) => setTargetStage(e.target.value)}
          aria-label="Set production stage"
        >
          {STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {PRODUCTION_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="adminOrderDetailInput"
          placeholder={isRevert ? "Required: why are you reverting this stage?" : "Optional note"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {photoAllowed && (
          <label className="productionTrackerPhotoLabel">
            <ImagePlus size={16} />
            {photo ? photo.name : "Attach proof photo (optional)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              hidden
            />
          </label>
        )}
        <button
          type="button"
          className="adminOrderDetailButton adminOrderDetailButton--primary"
          onClick={handleSubmitClick}
          disabled={isUpdating}
        >
          {isUpdating ? <Loader2 size={16} className="productionTrackerSpin" /> : isRevert ? "Revert stage" : "Advance stage"}
        </button>
      </div>

      {history.length > 0 && (
        <ul className="productionTrackerHistoryList">
          {history.map((entry, index) => (
            <li key={`${entry.changedAt}-${index}`} className="productionTrackerHistoryRow">
              <p className="adminOrderDetailLine">
                {PRODUCTION_STAGE_LABELS[entry.productionStage] ?? entry.productionStage}
                {entry.isRevert ? " (reverted)" : ""}
              </p>
              {entry.note && <p className="adminOrderDetailLineMuted">{entry.note}</p>}
              <p className="adminOrderDetailLineMuted">{formatDateTime(entry.changedAt)}</p>
              {entry.photoUrl && (
                <img src={entry.photoUrl} alt="Production proof" className="productionTrackerHistoryPhoto" />
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={isRevertModalOpen}
        title="Revert production stage?"
        description={`Move this order back to "${PRODUCTION_STAGE_LABELS[targetStage]}"? Reason: ${note.trim() || "(none)"}`}
        confirmLabel="Revert Stage"
        onConfirm={submit}
        onCancel={() => setIsRevertModalOpen(false)}
      />
    </section>
  );
}
