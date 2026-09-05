/**
 * FILE: lib/accountActivity.ts
 * PURPOSE:
 * Per-account activity trail for authenticated admin/super-admin
 * accounts (Rule 42) — separate from lib/securityLog.ts (login
 * attempts, attacks) and never used for anonymous public traffic.
 * Records page views and discrete actions inside /superAdmin and
 * /admin so a super-admin can review what an account did and from
 * where. Same never-break-the-request contract as logSecurityEvent.
 */
import { prisma } from "@/services/prisma";
import { UAParser } from "ua-parser-js";
import { getGeolocationFromIP } from "@/services/geoip";

interface RecordAccountActivityInput {
  accountId: string;
  action: string; // a page path (e.g. "/superAdmin/dashboard") or a named action (e.g. "cancelled_order")
  request?: Request | null;
}

export async function recordAccountActivity({
  accountId,
  action,
  request = null,
}: RecordAccountActivityInput): Promise<void> {
  try {
    const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request?.headers.get("user-agent") ?? null;
    const parsed = userAgent ? new UAParser(userAgent).getResult() : null;
    const geo = await getGeolocationFromIP(ipAddress);

    await prisma.accountActivityLog.create({
      data: {
        accountId,
        action,
        ipAddress,
        userAgent,
        deviceType: parsed?.device.type ?? "desktop",
        geoCity: geo.geoCity,
        geoCountry: geo.geoCountry,
      },
    });
  } catch (error) {
    // NEVER re-throw — activity logging is oversight, never load-bearing.
    console.error("[accountActivity] Failed to write event:", (error as Error).message);
  }
}
