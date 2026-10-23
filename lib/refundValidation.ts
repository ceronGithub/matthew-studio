/**
 * FILE: lib/refundValidation.ts
 * ROLE: Shared — the buyer refund route validates with it now, and the buyer
 * refund form (task-55c) reads the reason list from it, so the dropdown and
 * the server can never disagree about what a valid reason is.
 *
 * PURPOSE:
 * One place for the refund request rules (task-55b,
 * additional_platform_gaps_specification.md Section 4.2): which reasons the
 * dropdown offers, and the zod schema for the request body. The body carries
 * only the reason and an optional note — the amount and the order come from
 * the server, never from the client (Rule 6).
 *
 * DATA FLOW:
 * 1. The route passes the raw request body to refundRequestSchema.
 * 2. The note is trimmed and stripped of the Rule 18.1 forbidden characters
 *    (the same ones the form strips), because frontend stripping alone is
 *    only a UX guard.
 * 3. On failure the route returns the first message in the Rule 28 shape.
 */
import { z } from "zod";
import { refundMessages } from "@/lib/errorMessages";

export const REFUND_REASONS = [
  { value: "not_as_described", label: "Not as described" },
  { value: "not_working", label: "Doesn't work as expected" },
  { value: "damaged_or_defective", label: "Damaged or defective" },
  { value: "wrong_size_or_design", label: "Wrong size or design" },
  { value: "ordered_by_mistake", label: "Ordered by mistake" },
  { value: "other", label: "Other" },
] as const;

export type RefundReasonValue = (typeof REFUND_REASONS)[number]["value"];

export const REFUND_NOTE_MAX_LENGTH = 500;

// Rule 18.1 — characters never accepted in free text.
const FORBIDDEN_NOTE_CHARACTERS = /[<>{}[\]/\\;'"` =\-]/g;

/**
 * cleanNote
 * Collapses the forbidden characters out of the note. A space is part of the
 * Rule 18.1 set only as a leading/trailing nuisance, so spaces between words
 * are kept by putting them back as single spaces after stripping.
 */
function cleanNote(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.replace(FORBIDDEN_NOTE_CHARACTERS, ""))
    .filter((word) => word.length > 0)
    .join(" ");
}

export const refundRequestSchema = z.object({
  reason: z.enum(
    REFUND_REASONS.map((reason) => reason.value) as [RefundReasonValue, ...RefundReasonValue[]],
    { error: refundMessages.invalidReason }
  ),
  note: z
    .string()
    .max(REFUND_NOTE_MAX_LENGTH, { error: refundMessages.noteTooLong })
    .transform(cleanNote)
    .nullish()
    .transform((note) => (note ? note : null)),
});

export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
