/**
 * FILE: components/coupons/CouponTable.tsx
 * ROLE: Super-admin only — rendered by components/coupons/CouponManager.tsx.
 *
 * PURPOSE:
 * task-54g: the coupon rows — Code, Discount, Category, Used / Limit,
 * Expires, Status badge, and the on/off switch. Display only: the parent
 * decides what happens when a switch is pressed (a confirmation modal for
 * switching off, Rule 34.4).
 *
 * The API only stores isActive. "Expired" and "Used up" are worked out here
 * from expiresAt and usageCount so the badge tells the real story.
 */
"use client";

import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";
import type { CouponListItem } from "@/lib/hooks/useCoupons";

type CouponStatus = "active" | "off" | "expired" | "usedUp";

const STATUS_LABELS: Record<CouponStatus, string> = {
  active: "Active",
  off: "Switched off",
  expired: "Expired",
  usedUp: "Used up",
};

const STATUS_COLORS: Record<CouponStatus, string> = {
  active: "var(--color-success)",
  off: "var(--color-text-muted)",
  expired: "var(--color-error)",
  usedUp: "var(--color-warning)",
};

const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  CATEGORY_SHOWCASE.map((category) => [category.slug, category.name])
);

/**
 * getCouponStatus
 * A switched-off coupon always reads "Switched off". Otherwise it is
 * expired once its date has passed, used up once every redemption is taken.
 */
function getCouponStatus(coupon: CouponListItem): CouponStatus {
  if (!coupon.isActive) return "off";
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) return "expired";
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return "usedUp";
  return "active";
}

function formatDiscount(coupon: CouponListItem): string {
  if (coupon.discountType === "percentage") return `${coupon.discountValue}% off`;
  if (coupon.discountType === "fixed") return `₱${coupon.discountValue.toLocaleString("en-PH")} off`;
  return "Free shipping";
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface CouponTableProps {
  coupons: CouponListItem[];
  onToggle: (coupon: CouponListItem) => void;
}

export default function CouponTable({ coupons, onToggle }: CouponTableProps) {
  return (
    <div className="superAdminCouponsTableWrapper">
      <table className="superAdminCouponsTable">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Category</th>
            <th>Used / Limit</th>
            <th>Expires</th>
            <th>Status</th>
            <th className="superAdminCouponsActionsCell">On / Off</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <tr key={coupon.id}>
                <td className="superAdminCouponsCodeCell">{coupon.code}</td>
                <td>{formatDiscount(coupon)}</td>
                <td>{coupon.scopeCategory ? CATEGORY_NAMES[coupon.scopeCategory] ?? coupon.scopeCategory : "All"}</td>
                <td>{coupon.usageCount} / {coupon.usageLimit ?? "∞"}</td>
                <td>{formatExpiry(coupon.expiresAt)}</td>
                <td>
                  <span className="superAdminCouponsStatusBadge" style={{ color: STATUS_COLORS[status] }}>
                    {STATUS_LABELS[status]}
                  </span>
                </td>
                <td className="superAdminCouponsActionsCell">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={coupon.isActive}
                    aria-label={`${coupon.isActive ? "Switch off" : "Switch on"} coupon ${coupon.code}`}
                    className="superAdminCouponsSwitch"
                    onClick={() => onToggle(coupon)}
                  >
                    <span className="superAdminCouponsSwitchKnob" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
