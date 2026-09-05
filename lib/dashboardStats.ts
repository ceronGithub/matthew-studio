/**
 * FILE: lib/dashboardStats.ts
 * PURPOSE:
 * Read-only aggregation queries for the super-admin dashboard's
 * health widget and recent-activity widget
 * (super_admin_account_specification.md Section 3.1, Phase 2). Pure
 * data-fetching — no writes, no side effects. Kept separate from
 * lib/securityLog.ts / lib/accountActivity.ts (which are write-only)
 * so the dashboard's read path never accidentally shares a function
 * with the logging write path.
 */
import { prisma } from "@/services/prisma";

export interface DashboardHealthStats {
  securityEvents24h: number;
  failedLogins24h: number;
  activeBans: number;
  totalSecurityEvents: number;
}

export interface RecentActivityRow {
  id: string;
  accountId: string;
  action: string;
  createdAt: Date;
  geoCity: string | null;
  geoCountry: string | null;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * getDashboardHealthStats
 * Fails soft — a stats query failure returns all-zero counts rather
 * than crashing the dashboard page, since these are informational
 * only and not a reason to deny access to a super-admin.
 */
export async function getDashboardHealthStats(): Promise<DashboardHealthStats> {
  try {
    const since24h = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

    const [securityEvents24h, failedLogins24h, activeBans, totalSecurityEvents] = await Promise.all([
      prisma.securityLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.securityLog.count({ where: { eventType: "login_failed", createdAt: { gte: since24h } } }),
      prisma.deviceBan.count({ where: { isActive: true } }),
      prisma.securityLog.count(),
    ]);

    return { securityEvents24h, failedLogins24h, activeBans, totalSecurityEvents };
  } catch (error) {
    console.error("[dashboardStats] Failed to load health stats:", (error as Error).message);
    return { securityEvents24h: 0, failedLogins24h: 0, activeBans: 0, totalSecurityEvents: 0 };
  }
}

/**
 * getRecentAccountActivity
 * Last N account activity rows across all admin/super-admin accounts,
 * newest first — feeds the dashboard's "Recent Activity" widget.
 */
export async function getRecentAccountActivity(limit: number = 8): Promise<RecentActivityRow[]> {
  try {
    return await prisma.accountActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        accountId: true,
        action: true,
        createdAt: true,
        geoCity: true,
        geoCountry: true,
      },
    });
  } catch (error) {
    console.error("[dashboardStats] Failed to load recent activity:", (error as Error).message);
    return [];
  }
}
