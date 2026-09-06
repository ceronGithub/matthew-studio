/**
 * FILE: components/gatekeeper/GatekeeperBansList.tsx
 * ROLE: Super-Admin only — rendered inside app/superAdmin/gatekeeper/page.tsx.
 *
 * PURPOSE:
 * Completes task-33 (UI half): the DataTable-style viewer for
 * gatekeeper_specification.md Sections 5.2/8/9, wired to the already-
 * live API half — GET/POST /api/superadmin/gatekeeper/bans and
 * PUT /api/superadmin/gatekeeper/bans/[banId]/unban. Handles all
 * three required data states (Rule 25): loading skeleton, empty
 * state, and error state with retry. Manual ban runs behind
 * ManualBanModal; unban runs behind UnbanNoteModal (Rule 34.4's
 * confirmation-modal discipline, in reverse for lifting a ban) since
 * neither fits the shared ConfirmationModal's single-description
 * shape — both need a text input.
 */
"use client";

import { useState } from "react";
import { ShieldOff, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useGatekeeperBans, type DeviceBanListItem } from "@/lib/hooks/useGatekeeperBans";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import GatekeeperBanRow from "@/components/gatekeeper/GatekeeperBanRow";
import ManualBanModal from "@/components/gatekeeper/ManualBanModal";
import UnbanNoteModal from "@/components/gatekeeper/UnbanNoteModal";

const TRIGGER_FILTERS = [
  { value: "all", label: "All triggers" },
  { value: "manual", label: "Manual" },
  { value: "sql_injection_attempt", label: "SQL injection attempt" },
  { value: "location_anomaly", label: "Location anomaly" },
  { value: "login_failed", label: "Login failed (strikes)" },
  { value: "admin_login_denied", label: "Admin login denied (strikes)" },
  { value: "rate_limit_hit", label: "Rate limit hit (strikes)" },
];

const STATUS_FILTERS = [
  { value: "active", label: "Active bans" },
  { value: "lifted", label: "Lifted bans" },
  { value: "all", label: "All bans" },
];

export default function GatekeeperBansList() {
  const {
    bans,
    totalPages,
    page,
    isLoading,
    error,
    triggerEventType,
    isActiveFilter,
    dateFrom,
    dateTo,
    setTriggerEventType,
    setIsActiveFilter,
    setDateFrom,
    setDateTo,
    goToPage,
    refetch,
    banDevice,
    unbanDevice,
  } = useGatekeeperBans();

  const { toasts, showToast, dismissToast } = useToast();
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [pendingUnbanBan, setPendingUnbanBan] = useState<DeviceBanListItem | null>(null);

  async function handleBanSubmit(input: { deviceFingerprint: string; reason: string }) {
    const result = await banDevice(input);
    setIsBanModalOpen(false);
    showToast(result.success ? "✓ Device banned successfully." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleUnbanConfirm(unbanNote: string) {
    if (!pendingUnbanBan) return;
    const result = await unbanDevice(pendingUnbanBan.id, unbanNote);
    setPendingUnbanBan(null);
    showToast(result.success ? "✓ Device unbanned successfully." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="gatekeeperToolbar">
        <select
          className="gatekeeperFilterSelect"
          value={triggerEventType}
          onChange={(event) => setTriggerEventType(event.target.value)}
          aria-label="Filter by trigger type"
        >
          {TRIGGER_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="gatekeeperFilterSelect"
          value={isActiveFilter}
          onChange={(event) => setIsActiveFilter(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="gatekeeperFilterDate"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="gatekeeperFilterDate"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="To date"
        />

        <button type="button" className="gatekeeperBanButton" onClick={() => setIsBanModalOpen(true)}>
          <Plus size={16} />
          Ban a device
        </button>
      </div>

      {isLoading ? (
        <div className="gatekeeperGrid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="gatekeeperRow gatekeeperRow--skeleton">
              <div className="gatekeeperSkeletonLine skeletonBlock" />
              <div className="gatekeeperSkeletonLine skeletonBlock gatekeeperSkeletonLine--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="gatekeeperEmptyState">
          <ShieldOff size={32} />
          <p>{error}</p>
          <button type="button" className="gatekeeperRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      ) : bans.length === 0 ? (
        <div className="gatekeeperEmptyState">
          <ShieldOff size={32} />
          <p>No device bans match these filters.</p>
        </div>
      ) : (
        <>
          <div className="gatekeeperGrid">
            {bans.map((ban) => (
              <GatekeeperBanRow key={ban.id} ban={ban} onRequestUnban={setPendingUnbanBan} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="gatekeeperPagination">
              <button
                type="button"
                className="gatekeeperPageButton"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="gatekeeperPageLabel">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="gatekeeperPageButton"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <ManualBanModal isOpen={isBanModalOpen} onSubmit={handleBanSubmit} onCancel={() => setIsBanModalOpen(false)} />

      <UnbanNoteModal
        isOpen={pendingUnbanBan !== null}
        deviceFingerprint={pendingUnbanBan?.deviceFingerprint ?? ""}
        onConfirm={handleUnbanConfirm}
        onCancel={() => setPendingUnbanBan(null)}
      />
    </>
  );
}
