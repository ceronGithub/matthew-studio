/**
 * FILE: components/gatekeeper/GatekeeperBanRow.tsx
 * ROLE: Rendered only by components/gatekeeper/GatekeeperBansList.tsx,
 * one per DeviceBan row.
 *
 * PURPOSE:
 * Row-expand behavior task-33 called for: collapsed shows the
 * essentials (fingerprint, trigger badge, banned-at, status), expanded
 * reveals reason, strikeCount, bannedBy, relatedLogIds, and — once a
 * ban has been lifted — the unbannedAt/unbannedBy/unbanNote trail.
 * The Unban button only renders for still-active bans.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Ban } from "lucide-react";
import type { DeviceBanListItem } from "@/lib/hooks/useGatekeeperBans";

interface GatekeeperBanRowProps {
  ban: DeviceBanListItem;
  onRequestUnban: (ban: DeviceBanListItem) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GatekeeperBanRow({ ban, onRequestUnban }: GatekeeperBanRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`gatekeeperRow ${ban.isActive ? "" : "gatekeeperRow--lifted"}`}>
      <button
        type="button"
        className="gatekeeperRowSummary"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <div className="gatekeeperRowMain">
          <p className="gatekeeperRowFingerprint">{ban.deviceFingerprint}</p>
          <p className="gatekeeperRowDate">Banned {formatDate(ban.bannedAt)}</p>
        </div>

        <div className="gatekeeperRowMeta">
          <span className={`gatekeeperTriggerBadge gatekeeperTriggerBadge--${ban.triggerEventType}`}>
            {ban.triggerEventType === "manual" ? "Manual" : ban.triggerEventType}
          </span>
          <span className={`gatekeeperStatusBadge ${ban.isActive ? "gatekeeperStatusBadge--active" : ""}`}>
            {ban.isActive ? "Active" : "Lifted"}
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className="gatekeeperRowDetails">
          <p>
            <strong>Reason:</strong> {ban.reason}
          </p>
          <p>
            <strong>Strike count:</strong> {ban.strikeCount ?? "— (instant ban)"}
          </p>
          <p>
            <strong>Banned by:</strong> {ban.bannedBy}
          </p>
          <p>
            <strong>Related security log IDs:</strong>{" "}
            {ban.relatedLogIds.length > 0 ? ban.relatedLogIds.join(", ") : "None recorded"}
          </p>

          {!ban.isActive && (
            <>
              <p>
                <strong>Unbanned:</strong> {ban.unbannedAt ? formatDate(ban.unbannedAt) : "—"} by{" "}
                {ban.unbannedBy ?? "—"}
              </p>
              <p>
                <strong>Unban note:</strong> {ban.unbanNote ?? "—"}
              </p>
            </>
          )}

          {ban.isActive && (
            <button
              type="button"
              className="gatekeeperRowUnbanButton"
              onClick={() => onRequestUnban(ban)}
            >
              <Ban size={16} />
              Unban this device
            </button>
          )}
        </div>
      )}
    </div>
  );
}
