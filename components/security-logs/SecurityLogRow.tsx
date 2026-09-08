/**
 * FILE: components/security-logs/SecurityLogRow.tsx
 * ROLE: Rendered only by components/security-logs/SecurityLogsList.tsx,
 * one per SecurityLog row.
 *
 * PURPOSE:
 * Section 3.3's required row shape: collapsed shows Event Type
 * (badge), Actor, Device/Location, IP, Timestamp. Expanded reveals
 * the raw event data — device fingerprint, geolocation, user-agent,
 * browser/OS (Section 3.3's "Expandable rows" requirement). Read-only
 * — no actions on this page, unlike GatekeeperBanRow.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SecurityLogListItem } from "@/lib/hooks/useSecurityLogs";

interface SecurityLogRowProps {
  log: SecurityLogListItem;
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

// Section 3.3's badge color mapping — modifier class drives the color,
// applied via app/styles/securityLogs.css (never inline color styles).
function eventBadgeLabel(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function SecurityLogRow({ log }: SecurityLogRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const deviceLocationSummary = [log.deviceType, log.geoCity, log.geoCountry].filter(Boolean).join(" · ") || "—";

  return (
    <div className="securityLogRow">
      <button
        type="button"
        className="securityLogRowSummary"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className={`securityLogEventBadge securityLogEventBadge--${log.eventType}`}>
          {eventBadgeLabel(log.eventType)}
        </span>

        <span className="securityLogRowActor">{log.actor ?? "—"}</span>
        <span className="securityLogRowDeviceLocation">{deviceLocationSummary}</span>
        <span className="securityLogRowIp">{log.ipAddress ?? "—"}</span>
        <span className="securityLogRowDate">{formatDate(log.createdAt)}</span>

        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="securityLogRowDetails">
          <p>
            <strong>Details:</strong> {log.details ?? "—"}
          </p>
          <p>
            <strong>Device fingerprint:</strong> {log.deviceFingerprint ?? "—"}
          </p>
          <p>
            <strong>Browser / OS:</strong>{" "}
            {[log.browserName, log.browserVersion].filter(Boolean).join(" ") || "—"} on{" "}
            {[log.osName, log.osVersion].filter(Boolean).join(" ") || "—"}
          </p>
          <p>
            <strong>User agent:</strong> {log.userAgent ?? "—"}
          </p>
          <p>
            <strong>Geolocation:</strong>{" "}
            {log.geoCity || log.geoCountry
              ? `${log.geoCity ?? "—"}, ${log.geoCountry ?? "—"} (±${log.geoAccuracy ?? "?"}km, ${
                  log.geoLatitude ?? "?"
                }, ${log.geoLongitude ?? "?"})`
              : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
