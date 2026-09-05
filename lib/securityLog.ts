/**
 * FILE: lib/securityLog.ts
 * PURPOSE:
 * Central logging service for security events across the whole app
 * (auth, orders, webhooks, Gatekeeper). Writes to the SecurityLog
 * table via Prisma. Logging must never break the request it's
 * attached to — every write is wrapped in try/catch and failures are
 * only console.error'd, never re-thrown.
 *
 * Phase 2 upgrade: now also computes a device fingerprint (reused by
 * middleware.ts's Gatekeeper check, via lib/deviceFingerprint.ts) and
 * a city-level geolocation lookup (services/geoip.ts), so
 * lib/anomalyDetection.ts has data to compare each new login against.
 */
import { prisma } from "@/services/prisma";
import { UAParser } from "ua-parser-js";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";
import { getGeolocationFromIP } from "@/services/geoip";
import { evaluateGatekeeperTriggers } from "@/lib/gatekeeper";

interface LogSecurityEventInput {
  eventType: string;
  actor?: string | null;
  request?: Request | null;
  details?: string | null;
}

export async function logSecurityEvent({
  eventType,
  actor = null,
  request = null,
  details = null,
}: LogSecurityEventInput): Promise<void> {
  try {
    const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request?.headers.get("user-agent") ?? null;

    const parsed = userAgent ? new UAParser(userAgent).getResult() : null;
    const deviceFingerprint = request ? generateDeviceFingerprint(request.headers) : null;

    // Geolocation is looked up on every write — getGeolocationFromIP
    // never throws, so this is safe even when the .mmdb file hasn't
    // been downloaded yet (Rule 38.5's fail-safe behavior).
    const geo = await getGeolocationFromIP(ipAddress);

    await prisma.securityLog.create({
      data: {
        eventType,
        actor,
        details,
        ipAddress,
        userAgent,
        deviceFingerprint,
        deviceType: parsed?.device.type ?? "desktop",
        browserName: parsed?.browser.name ?? null,
        browserVersion: parsed?.browser.version ?? null,
        osName: parsed?.os.name ?? null,
        osVersion: parsed?.os.version ?? null,
        geoCountry: geo.geoCountry,
        geoCity: geo.geoCity,
        geoLatitude: geo.geoLatitude,
        geoLongitude: geo.geoLongitude,
        geoAccuracy: geo.geoAccuracy,
      },
    });

    // Gatekeeper reads directly off the row we just wrote — never a
    // separate strike-counter table (Rule 47.3). Never awaited into
    // failure of the parent write; it has its own internal try/catch.
    await evaluateGatekeeperTriggers({ eventType, deviceFingerprint });
  } catch (error) {
    // NEVER re-throw — a logging failure should never take down login/register.
    console.error("[securityLog] Failed to write event:", (error as Error).message);
  }
}
