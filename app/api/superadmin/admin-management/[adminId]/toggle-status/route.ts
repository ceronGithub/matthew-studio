/**
 * FILE: app/api/superadmin/admin-management/[adminId]/toggle-status/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the parent [adminId]/route.ts.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.1's row action and
 * Section 3.2.3's "Deactivate Account" button — task-95, part 2 of 4.
 * Flips the target admin's Supabase Auth ban_duration, same
 * "876600h"/"none" convention app/api/admin/users/[buyerId]/actions/
 * route.ts already uses for buyers, so lib/adminAccountStatus.ts's
 * existing isActiveBan derivation needs no changes to pick this up.
 *
 * The 5-second confirmation delay described in Section 3.2.1 is a UI
 * concern (Rule 34.4) that lives in the confirm button — this route
 * flips the status immediately once called, with no delay of its own.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Look up the target via lib/getAdminAuthUser.ts — 404 if not
 *    found or not role "admin" (blocks acting on a buyer or another
 *    super-admin id, self included, through this route).
 * 3. Read `action` ("deactivate" | "reactivate") from the request
 *    body — same discriminator shape as the buyer actions route,
 *    kept explicit rather than "just flip whatever it currently is"
 *    so a stale UI can't accidentally reverse an action it didn't
 *    intend.
 * 4. Write the corresponding ban_duration, then log
 *    admin_deactivated/admin_reactivated to SecurityLog (Rule 38).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { getAdminAuthUser } from "@/lib/getAdminAuthUser";
import { logSecurityEvent } from "@/lib/securityLog";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

// Same effectively-permanent convention as the buyer actions route —
// Supabase's Admin API has no dedicated "disable" flag, only a
// ban_duration string. "876600h" (~100 years) means "deactivated
// until a super-admin reverses it", never an auto-expiring timeout.
const DEACTIVATE_BAN_DURATION = "876600h";
const REACTIVATE_BAN_DURATION = "none";

interface ToggleStatusBody {
  action?: "deactivate" | "reactivate";
}

export async function POST(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { adminId } = await params;

    const authUser = await getAdminAuthUser(adminId);
    if (!authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that admin account. It may have been removed." },
        { status: 404 }
      );
    }

    const body: ToggleStatusBody = await request.json();
    const action = body.action;

    if (action !== "deactivate" && action !== "reactivate") {
      return NextResponse.json(
        { success: false, data: null, message: "Unknown action requested." },
        { status: 400 }
      );
    }

    const banDuration = action === "deactivate" ? DEACTIVATE_BAN_DURATION : REACTIVATE_BAN_DURATION;
    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(adminId, {
      ban_duration: banDuration,
    });
    if (updateError) {
      console.error("[api/.../toggle-status POST] Supabase update failed:", updateError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't update this admin's status. Please try again." },
        { status: 500 }
      );
    }

    await logSecurityEvent({
      eventType: action === "deactivate" ? "admin_deactivated" : "admin_reactivated",
      actor: admin.email,
      request,
      details: `Admin ${authUser.email ?? adminId}: ${action}d`,
    });

    return NextResponse.json({
      success: true,
      data: { isActive: action === "reactivate" },
      message: action === "deactivate" ? "Admin account deactivated." : "Admin account reactivated.",
    });
  } catch (error) {
    console.error("[api/.../toggle-status POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update this admin's status. Please try again." },
      { status: 500 }
    );
  }
}
