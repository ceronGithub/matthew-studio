/**
 * FILE: app/api/admin/analytics/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher. Also gated on
 * the "view-analytics" permission (hasAdminPermission) per Section
 * 3.5's "Availability: Only if admin has view-analytics permission".
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.5 — Analytics Dashboard.
 * Returns the combined time-series/category/buyer-metrics payload
 * from lib/adminAnalyticsStats.ts for the given date-range + category
 * filters (task-92, split from task-65 per Rule 49 Step 4 — this is
 * the API half, app/admin/analytics/page.tsx (task-93) is the UI
 * half).
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Check "view-analytics" permission; 403 if not granted.
 * 3. Parse `days` (preset windows: 1/7/30, or a custom day count) and
 *    `categories` (comma-separated ProductCategorySlug list).
 * 4. Call getAdminAnalyticsSummary() and return it as JSON.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { getAdminAnalyticsSummary } from "@/lib/adminAnalyticsStats";

const VALID_CATEGORIES = [
  "templates",
  "tshirts",
  "ai-videos",
  "file-tools",
  "tutorials",
  "game-characters",
];
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "You must be signed in as an admin to view this." },
        { status: 401 }
      );
    }

    if (!(await hasAdminPermission(admin, "view-analytics"))) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view analytics." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // "Today" preset maps to a 1-day window; anything else parses as
    // an integer day count, clamped to a sane range so a malformed or
    // huge value can't force an unbounded query.
    const rawDays = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS), 10);
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, MIN_DAYS), MAX_DAYS) : DEFAULT_DAYS;

    const rawCategories = searchParams.get("categories");
    const categories = rawCategories
      ? rawCategories.split(",").map((c) => c.trim()).filter((c) => VALID_CATEGORIES.includes(c))
      : null;

    const summary = await getAdminAnalyticsSummary(days, categories && categories.length ? categories : null);

    return NextResponse.json({
      success: true,
      data: summary,
      message: "Analytics loaded successfully.",
    });
  } catch (error) {
    console.error("[api/admin/analytics] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Failed to load analytics. Please try again." },
      { status: 500 }
    );
  }
}
