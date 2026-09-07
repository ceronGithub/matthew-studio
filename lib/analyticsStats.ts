/**
 * FILE: lib/analyticsStats.ts
 * PURPOSE:
 * Read-only aggregation queries for the super-admin Analytics
 * dashboard (task-91, sitewide_technical_seo_specification.md Section
 * 4.4 / Rule 41.3). Reads exclusively from `PageViewDaily` — the
 * pre-aggregated counter table written by services/analytics.ts's
 * recordPageView(). No IP, session ID, or visitor ID exists anywhere
 * in that table, so nothing here can ever surface per-visitor data —
 * every query is a SUM/GROUP BY over anonymous daily buckets.
 *
 * Same fail-soft contract as lib/dashboardStats.ts: a query failure
 * returns an empty/zeroed shape rather than crashing the page, since
 * this is informational only and never a reason to deny a super-admin
 * access to the rest of the dashboard.
 */
import { prisma } from "@/services/prisma";

export interface VisitsOverTimePoint {
  date: string; // "YYYY-MM-DD"
  totalViews: number;
}

export interface LabeledTotal {
  label: string;
  totalViews: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  visitsOverTime: VisitsOverTimePoint[];
  topPages: LabeledTotal[];
  topReferrers: LabeledTotal[];
  deviceBreakdown: LabeledTotal[];
  topCountries: LabeledTotal[];
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalViews: 0,
  visitsOverTime: [],
  topPages: [],
  topReferrers: [],
  deviceBreakdown: [],
  topCountries: [],
};

/**
 * toDateKey
 * Formats a Date as "YYYY-MM-DD" using UTC fields — matches how
 * services/analytics.ts buckets `date` (UTC calendar day, time
 * stripped), so a naive toISOString().slice(0, 10) would be safe too,
 * but this keeps the intent explicit.
 */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * buildContinuousDateRange
 * Returns every UTC calendar day from `daysAgo` days back through
 * today, oldest first — used to fill in zero-view days so the visits
 * chart doesn't silently skip days with no traffic at all.
 */
function buildContinuousDateRange(days: number): string[] {
  const result: string[] = [];
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(todayUtc);
    day.setUTCDate(day.getUTCDate() - offset);
    result.push(toDateKey(day));
  }

  return result;
}

/**
 * getAnalyticsSummary
 * Single entry point for the Analytics dashboard page — runs every
 * aggregate query in parallel over the same `days`-length window and
 * returns one combined shape. `days` defaults to 30, matching the
 * spec's "visits over time" expectation without needing a UI control
 * for the first cut of this page.
 */
export async function getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
  try {
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const startDate = new Date(todayUtc);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const dateFilter = { date: { gte: startDate } };

    const [totalAgg, byDate, byPath, byReferrer, byDevice, byCountry] = await Promise.all([
      prisma.pageViewDaily.aggregate({ where: dateFilter, _sum: { viewCount: true } }),
      prisma.pageViewDaily.groupBy({
        by: ["date"],
        where: dateFilter,
        _sum: { viewCount: true },
        orderBy: { date: "asc" },
      }),
      prisma.pageViewDaily.groupBy({
        by: ["path"],
        where: dateFilter,
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: "desc" } },
        take: 8,
      }),
      prisma.pageViewDaily.groupBy({
        by: ["referrerHost"],
        where: dateFilter,
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: "desc" } },
        take: 8,
      }),
      prisma.pageViewDaily.groupBy({
        by: ["deviceType"],
        where: dateFilter,
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: "desc" } },
      }),
      prisma.pageViewDaily.groupBy({
        by: ["countryCode"],
        where: dateFilter,
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: "desc" } },
        take: 10,
      }),
    ]);

    // Fill every day in the window so the chart shows true zero-view
    // days instead of silently compressing the x-axis.
    const countsByDate = new Map<string, number>();
    for (const row of byDate) {
      countsByDate.set(toDateKey(row.date), row._sum.viewCount ?? 0);
    }
    const visitsOverTime: VisitsOverTimePoint[] = buildContinuousDateRange(days).map((dateKey) => ({
      date: dateKey,
      totalViews: countsByDate.get(dateKey) ?? 0,
    }));

    return {
      totalViews: totalAgg._sum.viewCount ?? 0,
      visitsOverTime,
      topPages: byPath.map((row) => ({ label: row.path, totalViews: row._sum.viewCount ?? 0 })),
      topReferrers: byReferrer.map((row) => ({
        label: row.referrerHost ?? "Direct",
        totalViews: row._sum.viewCount ?? 0,
      })),
      deviceBreakdown: byDevice.map((row) => ({
        label: row.deviceType ?? "Unknown",
        totalViews: row._sum.viewCount ?? 0,
      })),
      topCountries: byCountry.map((row) => ({
        label: row.countryCode ?? "Unknown",
        totalViews: row._sum.viewCount ?? 0,
      })),
    };
  } catch (error) {
    console.error("[analyticsStats] Failed to load analytics summary:", (error as Error).message);
    return EMPTY_SUMMARY;
  }
}
