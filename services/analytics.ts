/**
 * FILE: services/analytics.ts
 * PURPOSE:
 * Rule 41 — anonymized, aggregate-only public traffic analytics.
 * Writes to PageViewDaily by upserting a daily counter bucket — never
 * a per-visitor event row. The IP address passed in is used ONLY to
 * resolve a country code via services/geoip.ts's existing lookup; the
 * IP itself, and every other geoip.ts field (city, lat/long, accuracy
 * radius), are discarded here and never reach the database. This is
 * deliberately narrower than SecurityLog/AccountActivityLog's full
 * geo capture — Rule 41 caps anonymous public traffic at
 * country-level, nothing finer.
 *
 * Same never-break-the-request contract as lib/securityLog.ts: every
 * write is wrapped in try/catch, failures are only console.error'd,
 * never re-thrown or surfaced to the visitor.
 */
import { prisma } from "@/services/prisma";
import { getGeolocationFromIP } from "@/services/geoip";

interface RecordPageViewInput {
  path: string;
  ipAddress: string | null;
  referrerHost?: string | null;
  deviceType?: string | null;
}

/**
 * recordPageView
 * Upserts today's counter bucket for (path, referrerHost, deviceType,
 * countryCode), incrementing viewCount by 1. Called from the beacon
 * route — never directly from a page/component.
 */
export async function recordPageView({
  path,
  ipAddress,
  referrerHost = null,
  deviceType = null,
}: RecordPageViewInput): Promise<void> {
  try {
    // Only the country code is kept — city/lat/long/accuracy from
    // this lookup are intentionally dropped, never assigned below.
    const { geoCountry } = await getGeolocationFromIP(ipAddress);

    // Bucket to the current UTC calendar day, time-of-day stripped so
    // every view on the same day lands in the same row.
    const today = new Date();
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    await prisma.pageViewDaily.upsert({
      where: {
        date_path_referrerHost_deviceType_countryCode: {
          date,
          path,
          referrerHost,
          deviceType,
          countryCode: geoCountry,
        },
      },
      create: {
        date,
        path,
        referrerHost,
        deviceType,
        countryCode: geoCountry,
        viewCount: 1,
      },
      update: {
        viewCount: { increment: 1 },
      },
    });
  } catch (error) {
    // Never break the request that triggered this — a dropped
    // analytics beacon is invisible to the visitor and low-stakes.
    console.error("[analytics] Failed to record page view:", (error as Error).message);
  }
}
