/**
 * FILE: components/account-activity/AccountActivityRow.tsx
 * ROLE: Rendered only by
 * components/account-activity/AccountActivityList.tsx, one per
 * AccountActivityLog row.
 *
 * PURPOSE:
 * Section 3.4's required row shape: collapsed shows Account Email,
 * Action, IP, Device, When. Expanded reveals the full user-agent and
 * city-level geolocation (Section 3.4's "Expandable rows"
 * requirement). Read-only — no actions on this page, same as
 * SecurityLogRow.tsx.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AccountActivityListItem } from "@/lib/hooks/useAccountActivity";

interface AccountActivityRowProps {
  log: AccountActivityListItem;
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

export default function AccountActivityRow({ log }: AccountActivityRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const locationSummary = [log.geoCity, log.geoCountry].filter(Boolean).join(", ") || "—";

  return (
    <div className="accountActivityRow">
      <button
        type="button"
        className="accountActivityRowSummary"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className="accountActivityRowAccount">{log.accountId}</span>
        <span className="accountActivityRowAction">{log.action}</span>
        <span className="accountActivityRowIp">{log.ipAddress ?? "—"}</span>
        <span className="accountActivityRowDevice">{log.deviceType ?? "—"}</span>
        <span className="accountActivityRowDate">{formatDate(log.createdAt)}</span>

        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="accountActivityRowDetails">
          <p>
            <strong>Location:</strong> {locationSummary}
          </p>
          <p>
            <strong>User agent:</strong> {log.userAgent ?? "—"}
          </p>
        </div>
      )}
    </div>
  );
}
