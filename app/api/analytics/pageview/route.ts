/**
 * FILE: app/api/analytics/pageview/route.ts
 * ROLE: Public — no auth required, called by the anonymous client-side
 * beacon (components/shared/AnalyticsBeacon.tsx) on every public page
 * load.
 *
 * PURPOSE:
 * Receives { path, referrerHost } from the beacon, derives deviceType
 * server-side from the User-Agent header (never trusts the client for
 * this), and hands off to services/analytics.ts to upsert the daily
 * aggregate bucket. The caller's IP is read here and passed in-memory
 * to recordPageView() for a country-code lookup only — this route
 * never writes the IP itself to any table or log (Rule 41.1).
 *
 * DATA FLOW:
 * 1. Beacon POSTs { path, referrerHost } on page load.
 * 2. Route reads IP + User-Agent from request headers.
 * 3. UAParser derives deviceType (mobile | tablet | desktop).
 * 4. recordPageView() upserts today's counter bucket.
 * 5. Always returns 204 — the beacon doesn't read the response body,
 *    and a slow/failed beacon must never be visible to the visitor.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";
import { recordPageView } from "@/services/analytics";

// Same forbidden-character guard as every other text input (Rule
// 18.1) — path is visitor-influenced (client sends its own pathname).
const FORBIDDEN_CHARS = /[<>{}[\]\\;'"`=]/g;
const MAX_PATH_LENGTH = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawPath = typeof body?.path === "string" ? body.path : null;

    // A missing/invalid path is silently ignored, not an error — this
    // is a best-effort beacon, never something a visitor should see
    // fail.
    if (!rawPath || !rawPath.startsWith("/")) {
      return new NextResponse(null, { status: 204 });
    }

    const path = rawPath.replace(FORBIDDEN_CHARS, "").slice(0, MAX_PATH_LENGTH);

    const rawReferrerHost = typeof body?.referrerHost === "string" ? body.referrerHost : null;
    const referrerHost = rawReferrerHost
      ? rawReferrerHost.replace(FORBIDDEN_CHARS, "").slice(0, 100)
      : null;

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");
    const deviceType = userAgent ? new UAParser(userAgent).getResult().device.type ?? "desktop" : null;

    // Fire-and-forget is intentionally NOT used here (unlike
    // detectAnomalies in lib/anomalyDetection.ts) — this route's only
    // job is this write, so it's awaited directly. Still fully
    // try/caught inside recordPageView() itself.
    await recordPageView({ path, ipAddress, referrerHost, deviceType });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Even a malformed request body must never surface an error to
    // the visitor — analytics is best-effort by design (Rule 41.3).
    console.error("[analytics/pageview] Unexpected error:", (error as Error).message);
    return new NextResponse(null, { status: 204 });
  }
}
