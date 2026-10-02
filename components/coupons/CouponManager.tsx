/**
 * FILE: components/coupons/CouponManager.tsx
 * ROLE: Super-admin only — rendered inside app/superAdmin/coupons/page.tsx.
 *
 * PURPOSE:
 * task-54g, additional_platform_gaps_specification.md Section 4.1 (admin
 * side): the coupon list with filters, the Create Coupon modal, and the
 * on/off switch. Handles the three required data states (Rule 25): loading
 * skeleton, empty state, error state with retry. Same structure as
 * components/announcements/AnnouncementsList.tsx.
 *
 * Switching a coupon OFF goes through the shared ConfirmationModal (Rule
 * 34.4). Switching it back ON is not destructive, so it fires directly.
 * Coupons are never deleted — the API has no DELETE by design.
 */
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { useCoupons, type CouponListItem } from "@/lib/hooks/useCoupons";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import CouponForm from "@/components/coupons/CouponForm";
import CouponTable from "@/components/coupons/CouponTable";

export default function CouponManager() {
  const {
    coupons, totalPages, totalCount, page, isLoading, error,
    filters, updateFilters, clearFilters, goToPage, refetch, setCouponActive,
  } = useCoupons();
  const { toasts, showToast, dismissToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // The coupon waiting for "are you sure?" before it is switched off.
  const [couponToSwitchOff, setCouponToSwitchOff] = useState<CouponListItem | null>(null);

  function handleCreated(message: string) {
    setIsFormOpen(false);
    showToast(`✓ ${message}`, "success");
    refetch();
  }

  async function changeActive(coupon: CouponListItem, isActive: boolean) {
    const result = await setCouponActive(coupon.id, isActive);
    if (result.success) {
      showToast(`✓ ${result.message}`, "success");
    } else {
      showToast(`✕ ${result.message ?? "We couldn't update the coupon. Please try again."}`, "error");
    }
  }

  // Off needs confirmation; on is safe to do straight away.
  function handleToggle(coupon: CouponListItem) {
    if (coupon.isActive) setCouponToSwitchOff(coupon);
    else changeActive(coupon, true);
  }

  async function handleSwitchOffConfirm() {
    if (!couponToSwitchOff) return;
    const coupon = couponToSwitchOff;
    setCouponToSwitchOff(null);
    await changeActive(coupon, false);
  }

  const hasFilters = Boolean(filters.status || filters.search);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <CouponForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSaved={handleCreated} />

      <ConfirmationModal
        isOpen={couponToSwitchOff !== null}
        title="Switch off coupon?"
        description={`Are you sure you want to switch off ${couponToSwitchOff?.code ?? ""}? Buyers will no longer be able to use it. You can switch it back on at any time.`}
        confirmLabel="Switch off"
        onConfirm={handleSwitchOffConfirm}
        onCancel={() => setCouponToSwitchOff(null)}
      />

      <div className="superAdminCouponsToolbar">
        <div className="superAdminCouponsFilters">
          <select
            className="superAdminCouponsFilterSelect"
            value={filters.status}
            onChange={(event) => updateFilters({ status: event.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All coupons</option>
            <option value="active">Switched on</option>
            <option value="inactive">Switched off</option>
          </select>

          <input
            type="search"
            className="superAdminCouponsFilterInput superAdminCouponsSearchInput"
            placeholder="Search code…"
            value={filters.search}
            // Codes hold only letters and digits, so anything else is dropped (Rule 18.1).
            onChange={(event) => updateFilters({ search: event.target.value.replace(/[^A-Za-z0-9]/g, "") })}
            aria-label="Search coupons by code"
          />

          {hasFilters && (
            <button type="button" className="superAdminCouponsClearFiltersButton" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <button type="button" className="superAdminCouponsCreateButton" onClick={() => setIsFormOpen(true)}>
          + Create Coupon
        </button>
      </div>

      {isLoading ? (
        <div className="superAdminCouponsGrid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="superAdminCouponsRow--skeleton">
              <div className="superAdminCouponsSkeletonLine skeletonBlock" />
              <div className="superAdminCouponsSkeletonLine skeletonBlock superAdminCouponsSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="superAdminCouponsEmptyState">
          <Ticket size={32} />
          <p>{error}</p>
          <button type="button" className="superAdminCouponsRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="superAdminCouponsEmptyState">
          <Ticket size={32} />
          <p>{hasFilters ? "No coupons match these filters." : "No coupons yet."}</p>
          {!hasFilters && (
            <button type="button" className="superAdminCouponsRetryButton" onClick={() => setIsFormOpen(true)}>
              Create your first coupon
            </button>
          )}
        </div>
      ) : (
        <>
          <CouponTable coupons={coupons} onToggle={handleToggle} />

          <div className="superAdminCouponsFooter">
            <span className="superAdminCouponsTotalCount">
              {totalCount} total coupon{totalCount === 1 ? "" : "s"}
            </span>

            {totalPages > 1 && (
              <div className="superAdminCouponsPagination">
                <button
                  type="button"
                  className="superAdminCouponsPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="superAdminCouponsPageLabel">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="superAdminCouponsPageButton"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
