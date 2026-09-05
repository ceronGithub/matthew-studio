/**
 * FILE: lib/gatekeeper.ts
 * PURPOSE:
 * Two responsibilities for the Gatekeeper device-ban system
 * (gatekeeper_specification.md, Rule 47.3):
 *
 *   1. checkDeviceBan() — read-only lookup used by middleware.ts on
 *      every matched request, ahead of any role-based routing. Fails
 *      OPEN on a DB error (same convention as lib/rateLimit.ts) —
 *      a Gatekeeper outage should never lock every visitor out of the
 *      whole site.
 *
 *   2. evaluateGatekeeperTriggers() — called from lib/securityLog.ts
 *      after every SecurityLog write. Applies instant-ban rules
 *      (sql_injection_attempt, location_anomaly — 1 occurrence) and
 *      3-strike rules (login_failed, admin_login_denied,
 *      registration_abuse, rate_limit_hit, password_recovery_failed —
 *      3 occurrences from the same device within a rolling 24h
 *      window, counted directly from SecurityLog, no separate counter
 *      table). Bans are permanent until a super-admin manually unbans
 *      via the /superAdmin/gatekeeper page — no auto-expiry.
 */
import { prisma } from "@/services/prisma";

const INSTANT_BAN_EVENT_TYPES = ["sql_injection_attempt", "location_anomaly"];
const STRIKE_EVENT_TYPES = [
  "login_failed",
  "admin_login_denied",
  "registration_abuse",
  "rate_limit_hit",
  "password_recovery_failed",
];
const STRIKE_THRESHOLD = 3;
const STRIKE_WINDOW_HOURS = 24;

interface BanDeviceInput {
  deviceFingerprint: string;
  reason: string;
  triggerEventType: string;
  strikeCount: number | null;
  relatedLogIds: string[];
}

async function banDevice(input: BanDeviceInput): Promise<void> {
  await prisma.deviceBan.create({
    data: {
      deviceFingerprint: input.deviceFingerprint,
      reason: input.reason,
      triggerEventType: input.triggerEventType,
      strikeCount: input.strikeCount,
      relatedLogIds: input.relatedLogIds,
      bannedBy: "system",
    },
  });
}

/**
 * checkDeviceBan
 * Returns the active DeviceBan row for this fingerprint, or null if
 * not banned. Never throws — a lookup failure fails OPEN (returns
 * null / "not banned") rather than blocking every visitor because of
 * an unrelated DB hiccup.
 */
export async function checkDeviceBan(deviceFingerprint: string | null) {
  if (!deviceFingerprint) return null;

  try {
    return await prisma.deviceBan.findFirst({
      where: { deviceFingerprint, isActive: true },
    });
  } catch (error) {
    console.error("[gatekeeper] Ban check failed, failing open:", (error as Error).message);
    return null;
  }
}

/**
 * evaluateGatekeeperTriggers
 * Call after a SecurityLog row has been written for this event. Never
 * throws — wrapped internally so a failure here never breaks the
 * logging call site.
 */
export async function evaluateGatekeeperTriggers({
  eventType,
  deviceFingerprint,
}: {
  eventType: string;
  deviceFingerprint: string | null;
}): Promise<void> {
  if (!deviceFingerprint) return;

  try {
    const existingBan = await prisma.deviceBan.findUnique({ where: { deviceFingerprint } });
    if (existingBan?.isActive) return; // already banned — nothing more to do

    // --- Instant ban: 1 occurrence is enough ---
    if (INSTANT_BAN_EVENT_TYPES.includes(eventType)) {
      const triggeringLog = await prisma.securityLog.findFirst({
        where: { deviceFingerprint, eventType },
        orderBy: { createdAt: "desc" },
      });

      await banDevice({
        deviceFingerprint,
        reason: `Instant ban: ${eventType} detected`,
        triggerEventType: eventType,
        strikeCount: null,
        relatedLogIds: triggeringLog ? [triggeringLog.id] : [],
      });
      return;
    }

    // --- 3-strike ban: rolling 24h window, combined across strike-eligible event types ---
    if (STRIKE_EVENT_TYPES.includes(eventType)) {
      const windowStart = new Date(Date.now() - STRIKE_WINDOW_HOURS * 60 * 60 * 1000);

      const recentStrikes = await prisma.securityLog.findMany({
        where: {
          deviceFingerprint,
          eventType: { in: STRIKE_EVENT_TYPES },
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentStrikes.length >= STRIKE_THRESHOLD) {
        await banDevice({
          deviceFingerprint,
          reason: `3-strike ban: ${recentStrikes.length}x flagged events within 24h (latest: ${eventType})`,
          triggerEventType: eventType,
          strikeCount: recentStrikes.length,
          relatedLogIds: recentStrikes.slice(0, 10).map((row) => row.id),
        });
      }
    }
  } catch (error) {
    console.error("[gatekeeper] Failed to evaluate triggers:", (error as Error).message);
  }
}
