/**
 * FILE: components/shared/AnalyticsBeacon.tsx
 * ROLE: Mounted ONLY inside app/(public)/layout.tsx — never inside
 * app/superAdmin, app/admin, app/buyer, or app/auth. Those areas'
 * navigation is already covered by AccountActivityLog (Rule 42), a
 * different table with a different, per-account-identifiable purpose.
 * This component must never be added to an authenticated layout — that
 * would blur Rule 41's anonymous/aggregate-only boundary with Rule
 * 42's per-account trail.
 *
 * PURPOSE:
 * Fires a fire-and-forget beacon to POST /api/analytics/pageview on
 * every public route change. Renders nothing — this is a side-effect-
 * only component.
 *
 * WHY it doesn't need visitor consent (Rule 41.1/41.3):
 * It sends only the current pathname and the referrer's hostname —
 * both already fully derivable from what the browser sends the server
 * on any normal page load. No cookie, no localStorage, no visitor ID
 * is created or read here.
 */
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Referrer host only (e.g. "google.com") — never the full referrer
    // URL, which could otherwise leak a previous page's query string.
    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      referrerHost = null;
    }

    const payload = JSON.stringify({ path: pathname, referrerHost });

    // sendBeacon survives the page unloading (e.g. immediate
    // navigation away) better than fetch — falls back to a
    // fire-and-forget fetch for browsers/environments without it.
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/pageview", blob);
    } else {
      fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Best-effort only — a dropped beacon is never worth surfacing.
      });
    }
  }, [pathname]);

  return null;
}
