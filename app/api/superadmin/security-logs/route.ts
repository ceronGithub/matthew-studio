/**
 * FILE: app/api/superadmin/security-logs/route.ts
 * ROLE: Super-admin only — super_admin_account_specification.md
 * Section 3.3 (task-45, API half). Strictly role === "superAdmin",
 * same pattern as app/api/superadmin/gatekeeper/bans/route.ts —
 * platform-wide, unscoped view of every SecurityLog row.
 *
 * PURPOSE:
 * GET — paginated, filterable SecurityLog list (Rule 38.9) for the
 * /superAdmin/security-logs viewer page. Delegates the actual query
 * to lib/securityLogsQuery.ts, shared with the admin route below
 * (task-42) so both pages stay in sync on filtering/pagination
 * behavior.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { listSecurityLogs } from "@/lib/securityLogsQuery";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin || admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10) || PAGE_SIZE));
    const eventType = searchParams.get("eventType") ?? undefined;
    const deviceType = searchParams.get("deviceType") ?? undefined;
    const geoCountry = searchParams.get("geoCountry") ?? undefined;
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    // No actorEmail passed — super-admin sees every account's events.
    const result = await listSecurityLogs({ page, limit, eventType, deviceType, geoCountry, dateFrom, dateTo });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Security logs retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/security-logs GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load security logs. Please try again." },
      { status: 500 }
    );
  }
}
