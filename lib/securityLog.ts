/**
 * FILE: lib/securityLog.ts
 * PURPOSE:
 * Central logging service for auth security events (login_success,
 * login_failed, registration_failed). Writes to the SecurityLog table
 * via Prisma. Logging must never break the request it's attached to —
 * every write is wrapped in try/catch and failures are only
 * console.error'd, never re-thrown.
 *
 * This is the basic version: event + actor + IP + parsed user agent.
 * No geolocation yet (would need a MaxMind GeoLite2 database file) —
 * can be added later without changing this function's signature.
 */
import { prisma } from "@/services/prisma";
import { UAParser } from "ua-parser-js";

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

    await prisma.securityLog.create({
      data: {
        eventType,
        actor,
        details,
        ipAddress,
        userAgent,
        deviceType: parsed?.device.type ?? "desktop",
        browserName: parsed?.browser.name ?? null,
        browserVersion: parsed?.browser.version ?? null,
        osName: parsed?.os.name ?? null,
        osVersion: parsed?.os.version ?? null,
      },
    });
  } catch (error) {
    // NEVER re-throw — a logging failure should never take down login/register.
    console.error("[securityLog] Failed to write event:", (error as Error).message);
  }
}
