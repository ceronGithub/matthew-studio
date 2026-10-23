/**
 * FILE: lib/refundEligibility.ts
 * ROLE: Server-side only for now — used by
 * app/api/buyer/orders/[orderId]/refund-request/route.ts (task-55b); the
 * "Request Refund" button (task-55c) will show or hide itself from the same
 * answer, so the button and the API can never disagree.
 *
 * PURPOSE:
 * Decides whether one order may still be refunded. Follows the /refund-policy
 * page (decided 2026-10-24): digital-only orders have 7 days from purchase;
 * orders that include apparel have 14 days from delivery. Only Delivered or
 * Cancelled orders qualify, only paid orders, and only once.
 *
 * DATA FLOW:
 * 1. The caller passes the order's status fields and whether it holds a t-shirt.
 * 2. Status, payment and "already refunded" are checked first.
 * 3. The window start is worked out: purchase date for digital-only,
 *    delivery (or cancellation) date for apparel — read from statusHistory,
 *    falling back to updatedAt for older orders that have no history entry.
 * 4. Returns { eligible: true, windowEndsAt } or { eligible: false, message }.
 */
import { refundMessages } from "@/lib/errorMessages";

const DIGITAL_WINDOW_DAYS = 7;
const APPAREL_WINDOW_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface StatusHistoryEntry {
  status?: string;
  createdAt?: string;
}

export interface RefundEligibilityOrder {
  status: string;
  paidAt: Date | null;
  paymongoPaymentId: string | null;
  refundedAt: Date | null;
  updatedAt: Date;
  statusHistory: unknown;
  hasApparelItem: boolean;
}

export type RefundEligibility =
  | { eligible: true; windowEndsAt: Date }
  | { eligible: false; message: string };

/**
 * findStatusDate
 * The most recent time the order entered the given status, from the
 * statusHistory Json array. Null when no entry exists.
 */
function findStatusDate(statusHistory: unknown, wantedStatus: string): Date | null {
  if (!Array.isArray(statusHistory)) return null;

  const matchingTimes = (statusHistory as StatusHistoryEntry[])
    .filter((entry) => entry.status?.toLowerCase() === wantedStatus && entry.createdAt)
    .map((entry) => Date.parse(entry.createdAt as string))
    .filter((time) => !Number.isNaN(time));

  return matchingTimes.length > 0 ? new Date(Math.max(...matchingTimes)) : null;
}

export function getRefundEligibility(order: RefundEligibilityOrder): RefundEligibility {
  const statusKey = order.status.toLowerCase();

  if (statusKey === "refunded" || order.refundedAt) {
    return { eligible: false, message: refundMessages.alreadyRefunded };
  }

  if (statusKey !== "delivered" && statusKey !== "cancelled") {
    return { eligible: false, message: refundMessages.notEligibleStatus };
  }

  // A PayMongo refund needs the payment id the webhook saved (Rule 30.1).
  if (!order.paidAt || !order.paymongoPaymentId) {
    return { eligible: false, message: refundMessages.notPaid };
  }

  // Digital-only: counted from purchase. Apparel: counted from delivery
  // (or from the cancellation date on a cancelled order).
  const windowStart = order.hasApparelItem
    ? findStatusDate(order.statusHistory, statusKey) ?? order.updatedAt
    : order.paidAt;
  const windowDays = order.hasApparelItem ? APPAREL_WINDOW_DAYS : DIGITAL_WINDOW_DAYS;
  const windowEndsAt = new Date(windowStart.getTime() + windowDays * MILLISECONDS_PER_DAY);

  if (Date.now() > windowEndsAt.getTime()) {
    return {
      eligible: false,
      message: order.hasApparelItem ? refundMessages.windowClosedApparel : refundMessages.windowClosedDigital,
    };
  }

  return { eligible: true, windowEndsAt };
}
