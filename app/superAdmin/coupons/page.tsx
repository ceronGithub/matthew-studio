/**
 * FILE: app/superAdmin/coupons/page.tsx
 * ROLE: Super-admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard. Ordinary admins cannot manage coupons.
 *
 * PURPOSE:
 * task-54g, additional_platform_gaps_specification.md Section 4.1 (admin
 * side): the page where the super-admin creates promo codes and switches
 * them on or off. Stays a Server Component (Rule 31.1); all data fetching
 * and interactivity lives in the client-only CouponManager below it, same
 * split as /superAdmin/announcements.
 */
import type { Metadata } from "next";
import CouponManager from "@/components/coupons/CouponManager";
import "../../styles/superAdminCoupons.css";

export const metadata: Metadata = {
  title: "Coupons | Matthew Studio Super Admin",
  description: "Create promo codes and switch them on or off.",
};

export default function SuperAdminCouponsPage() {
  return (
    <section className="superAdminCouponsPage">
      <div className="superAdminCouponsHeader">
        <p className="superAdminCouponsEyebrow">Super Admin</p>
        <h1 className="superAdminCouponsTitle">Coupons</h1>
        <p className="superAdminCouponsSubtitle">
          Create promo codes and switch them on or off. Coupons are never deleted, so past orders keep their history.
        </p>
      </div>

      <CouponManager />
    </section>
  );
}
