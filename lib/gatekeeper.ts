/**
 * FILE: lib/gatekeeper.ts
 * PURPOSE:
 * Four responsibilities for the Gatekeeper device-ban system
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
 *
 *   3. listDeviceBans() / manualBanDevice() / unbanDevice() — back the
 *      /superAdmin/gatekeeper viewer page (Section 8) and its API
 *      routes (Section 9, task-33). manualBanDevice() lets a
 *      super-admin ban a device that hasn't yet crossed the automatic
 *      strike threshold (Section 5.2); unbanDevice() requires a
 *      non-empty note, mirroring Rule 34.4's confirmation-modal
 *      discipline for destructive/security-sensitive actions.
 *
 * NOTE ON device_banned / device_unbanned LOGGING:
 * These two actions write their own SecurityLog row directly via
 * Prisma (writeGatekeeperAuditLog below) rather than calling
 * lib/securityLog.ts's logSecurityEvent() — that helper computes
 * deviceFingerprint from the CALLING request's own headers, which
 * would record the super-admin's device, not the device being
 * banned/unbanned. Writing directly also avoids a circular import,
 * since securityLog.ts already imports evaluateGatekeeperTriggers
 * from this file.
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

/**
 * writeGatekeeperAuditLog
 * Writes a device_banned / device_unbanned row directly to
 * SecurityLog (Rule 38) for the device that was just banned/unbanned
 * — never the calling super-admin's own device. Never throws; a
 * failed audit write should not undo or block the ban/unban action
 * that already succeeded.
 */
async function writeGatekeeperAuditLog(input: {
  eventType: "device_banned" | "device_unbanned";
  actor: string | null;
  deviceFingerprint: string;
  details: string;
}): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        eventType: input.eventType,
        actor: input.actor,
        details: input.details,
        deviceFingerprint: input.deviceFingerprint,
      },
    });
  } catch (error) {
    console.error("[gatekeeper] Failed to write audit log:", (error as Error).message);
  }
}

export interface ListDeviceBansParams {
  page: number;
  limit: number;
  triggerEventType?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * listDeviceBans
 * Paginated, filterable read for the /superAdmin/gatekeeper page
 * (Section 8) and its GET API route. Newest first, matching every
 * other Rule 38.9-style viewer page in this project.
 */
export async function listDeviceBans({
  page,
  limit,
  triggerEventType,
  isActive,
  dateFrom,
  dateTo,
}: ListDeviceBansParams) {
  const where: {
    triggerEventType?: string;
    isActive?: boolean;
    bannedAt?: { gte?: Date; lte?: Date };
  } = {};

  if (triggerEventType) where.triggerEventType = triggerEventType;
  if (isActive !== undefined) where.isActive = isActive;
  if (dateFrom || dateTo) {
    where.bannedAt = {};
    if (dateFrom) where.bannedAt.gte = dateFrom;
    if (dateTo) where.bannedAt.lte = dateTo;
  }

  const [bans, totalCount] = await Promise.all([
    prisma.deviceBan.findMany({
      where,
      orderBy: { bannedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deviceBan.count({ where }),
  ]);

  return { bans, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)), page };
}

/**
 * manualBanDevice
 * Section 5.2 — lets a super-admin ban a device that hasn't yet
 * crossed the automatic strike threshold (e.g. a suspicious pattern
 * spotted on the Security Logs page). Rejects a device that already
 * has an active ban rather than silently creating a duplicate row —
 * deviceFingerprint is @unique on DeviceBan.
 */
export async function manualBanDevice(input: {
  deviceFingerprint: string;
  reason: string;
  bannedByEmail: string;
}): Promise<{ success: true; banId: string } | { success: false; message: string }> {
  const existing = await prisma.deviceBan.findUnique({ where: { deviceFingerprint: input.deviceFingerprint } });
  if (existing?.isActive) {
    return { success: false, message: "This device is already banned." };
  }

  const ban = await prisma.deviceBan.create({
    data: {
      deviceFingerprint: input.deviceFingerprint,
      reason: input.reason,
      triggerEventType: "manual",
      strikeCount: null,
      relatedLogIds: [],
      bannedBy: input.bannedByEmail,
    },
  });

  await writeGatekeeperAuditLog({
    eventType: "device_banned",
    actor: input.bannedByEmail,
    deviceFingerprint: input.deviceFingerprint,
    details: `Manual ban: ${input.reason}`,
  });

  return { success: true, banId: ban.id };
}

/**
 * unbanDevice
 * Section 8 — the only way any ban is lifted. Requires a non-empty
 * unbanNote (Rule 34.4's confirmation-modal discipline for
 * destructive/security-sensitive actions) — never a one-click unban.
 */
export async function unbanDevice(input: {
  banId: string;
  unbanNote: string;
  unbannedByEmail: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  if (!input.unbanNote.trim()) {
    return { success: false, message: "A note explaining the unban is required." };
  }

  const ban = await prisma.deviceBan.findUnique({ where: { id: input.banId } });
  if (!ban) {
    return { success: false, message: "Ban record not found." };
  }
  if (!ban.isActive) {
    return { success: false, message: "This device is not currently banned." };
  }

  await prisma.deviceBan.update({
    where: { id: input.banId },
    data: {
      isActive: false,
      unbannedAt: new Date(),
      unbannedBy: input.unbannedByEmail,
      unbanNote: input.unbanNote.trim(),
    },
  });

  await writeGatekeeperAuditLog({
    eventType: "device_unbanned",
    actor: input.unbannedByEmail,
    deviceFingerprint: ban.deviceFingerprint,
    details: `Unbanned: ${input.unbanNote.trim()}`,
  });

  return { success: true };
}
