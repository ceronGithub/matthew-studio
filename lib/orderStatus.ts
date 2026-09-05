/**
 * FILE: lib/orderStatus.ts
 * PURPOSE:
 * Single source of truth for turning a raw Order.status value into a
 * buyer-facing label + badge color, shared by OrdersList.tsx (list)
 * and the order tracking detail page (buyer_order_tracking_specification.md
 * Section 3.1/3.2 — "same 5 top-level statuses ... same color mapping
 * for consistency").
 *
 * Order.status's actual stored values (prisma/schema.prisma) are
 * lowercase "pending", uppercase "PAID"/"FAILED" (webhook-owned, Rule
 * 30.1/30.2), and admin-set "Confirmed"/"Shipped"/"Delivered"/
 * "Cancelled" — this spec was written before "PAID"/"FAILED" existed,
 * so PAID is mapped to the spec's "Confirmed" bucket (payment
 * received, awaiting fulfillment) and FAILED gets its own "Payment
 * Failed" bucket rather than being hidden or misrepresented as
 * Cancelled — a buyer with a failed payment still needs to see that,
 * so they know to retry.
 */

export type BuyerOrderStatusKey = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "failed";

interface StatusDisplay {
  label: string;
  colorVar: "--color-warning" | "--color-info" | "--color-accent" | "--color-success" | "--color-error";
}

const STATUS_DISPLAY: Record<BuyerOrderStatusKey, StatusDisplay> = {
  pending: { label: "Pending", colorVar: "--color-warning" },
  confirmed: { label: "Confirmed", colorVar: "--color-info" },
  shipped: { label: "Shipped", colorVar: "--color-accent" },
  delivered: { label: "Delivered", colorVar: "--color-success" },
  cancelled: { label: "Cancelled", colorVar: "--color-error" },
  failed: { label: "Payment Failed", colorVar: "--color-error" },
};

/**
 * resolveOrderStatusKey
 * Normalizes a raw Order.status string into one of the 6 display
 * buckets above.
 */
export function resolveOrderStatusKey(rawStatus: string): BuyerOrderStatusKey {
  const normalized = rawStatus.toLowerCase();
  if (normalized === "paid") return "confirmed";
  if (normalized === "failed") return "failed";
  if (normalized === "pending" || normalized === "confirmed" || normalized === "shipped" || normalized === "delivered" || normalized === "cancelled") {
    return normalized as BuyerOrderStatusKey;
  }
  return "pending";
}

export function getOrderStatusDisplay(rawStatus: string): StatusDisplay {
  return STATUS_DISPLAY[resolveOrderStatusKey(rawStatus)];
}

/**
 * PRODUCTION_STAGE_LABELS
 * T-shirt orders only (admin_account_specification.md Section 3.3.3's
 * 6-stage pipeline). Shown as a mini label under the status badge on
 * the order card, and reused by the tracking timeline on the detail
 * page. Digital-only orders never populate productionStage, so this
 * map is only consulted when the field is non-null.
 */
export const PRODUCTION_STAGE_LABELS: Record<string, string> = {
  design_review: "Design Review",
  design_approved: "Design Approved",
  printing: "Printing",
  quality_check: "Quality Check",
  packed: "Packed",
  shipped: "Shipped",
};
