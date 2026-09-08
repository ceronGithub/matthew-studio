/**
 * FILE: app/api/superadmin/account-activity/route.ts
 * ROLE: Super-admin only — super_admin_account_specification.md
 * Section 3.4 (task-46). Strictly role === "superAdmin", same pattern
 * as app/api/superadmin/security-logs/route.ts.
 *
 * PURPOSE:
 * GET — paginated, filterable AccountActivityLog list (Rule 42.3) for
 * the /superAdmin/account-activity viewer page. Delegates the actual
 * query to lib/accountActivityQuery.ts. Also returns the distinct
 * account list in the same response so the page's account dropdown
 * never needs a second round trip.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { listAccountActivity, listDistinctAccountActors } from "@/lib/accountActivityQuery";

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
    const accountId = searchParams.get("accountId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    const [result, accounts] = await Promise.all([
      listAccountActivity({ page, limit, accountId, action, dateFrom, dateTo }),
      listDistinctAccountActors(),
    ]);

    return NextResponse.json({
      success: true,
      data: { ...result, accounts },
      message: "Account activity retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/account-activity GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load account activity. Please try again." },
      { status: 500 }
    );
  }
}
