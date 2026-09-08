/**
 * FILE: app/api/admin/security-logs/route.ts
 * ROLE: Admin/super-admin only — admin_account_specification.md
 * Section 3.6 (task-42, API half). Gated on the "view-security-logs"
 * permission (Section 3.6's "Availability" line); a super-admin
 * calling this route sees only their own events too — the unscoped,
 * platform-wide view lives at /api/superadmin/security-logs instead.
 *
 * PURPOSE:
 * GET — paginated, filterable SecurityLog list, always scoped to
 * `WHERE actor = currentAdmin.email` server-side (Section 3.6's scope
 * restriction: "never rely on frontend filtering alone"). Delegates
 * to the same lib/securityLogsQuery.ts used by the super-admin route,
 * just always passing actorEmail.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { listSecurityLogs } from "@/lib/securityLogsQuery";

const PAGE_SIZE = 25;

// Section 3.6's filter list: admin-relevant events only. Platform-
// level events (sql_injection_attempt, location_anomaly on other
// accounts, etc.) are excluded from the filter options shown to an
// admin, even though the WHERE actor= scope would already exclude
// other accounts' rows regardless of eventType chosen here.
const ADMIN_VISIBLE_EVENT_TYPES = ["login_success", "login_failed", "rate_limit_hit", "device_change"];

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "You must be signed in as an admin to view this." },
        { status: 401 }
      );
    }

    if (!admin.email) {
      return NextResponse.json(
        { success: false, data: null, message: "Your account has no email on file." },
        { status: 400 }
      );
    }

    if (!(await hasAdminPermission(admin, "view-security-logs"))) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view security logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10) || PAGE_SIZE));
    const rawEventType = searchParams.get("eventType") ?? undefined;
    const eventType = rawEventType && ADMIN_VISIBLE_EVENT_TYPES.includes(rawEventType) ? rawEventType : undefined;
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    // actorEmail always set — an admin can only ever see their own events.
    const result = await listSecurityLogs({ page, limit, eventType, actorEmail: admin.email, dateFrom, dateTo });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Security logs retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/security-logs GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load security logs. Please try again." },
      { status: 500 }
    );
  }
}
