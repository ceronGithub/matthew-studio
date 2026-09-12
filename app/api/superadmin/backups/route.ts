/**
 * FILE: app/api/superadmin/backups/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/account-activity/route.ts and
 * app/api/superadmin/security-logs/route.ts.
 *
 * PURPOSE:
 * GET — paginated, filterable BackupLog list (Rule 40.6) for the
 * /superAdmin/backups page (task-105). Delegates the query to
 * lib/backupsQuery.ts.
 *
 * Strictly read-only, per Rule 40.6: this route must NEVER trigger a
 * backup. There is intentionally no POST handler here — an on-demand
 * run only happens via GitHub Actions' workflow_dispatch (task-103),
 * never through this app.
 *
 * DEVIATION FROM task-104's OWN SPEC FILE: docs/tasks/task-104-api-
 * admin-backups-list.md named the path app/api/superAdmin/backups/
 * route.ts (camelCase), but every other super-admin API route in this
 * repo actually lives under the lowercase app/api/superadmin/ folder
 * (see account-activity, security-logs, admin-management, gatekeeper)
 * — corrected here to match the real, existing convention rather than
 * introduce a second, inconsistent folder.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { listBackupLogs } from "@/lib/backupsQuery";

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
    const rawStatus = searchParams.get("status") ?? undefined;
    const status = rawStatus && ["running", "success", "failed"].includes(rawStatus) ? rawStatus : undefined;

    const result = await listBackupLogs({ page, limit, status });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Backup history retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/backups GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load backup history. Please try again." },
      { status: 500 }
    );
  }
}
