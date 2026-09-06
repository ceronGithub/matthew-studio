/**
 * FILE: app/api/superadmin/gatekeeper/bans/route.ts
 * ROLE: Super-admin only — gatekeeper_specification.md Section 9.
 * Unlike /api/admin/* routes, this checks for role === "superAdmin"
 * strictly (not "admin" OR "superAdmin") — only a super-admin may
 * view or issue device bans (Section 8).
 *
 * PURPOSE:
 * GET  — paginated, filterable device-ban list for the
 *        /superAdmin/gatekeeper viewer page.
 * POST — manual ban (Section 5.2): bans a device that hasn't yet
 *        crossed the automatic 3-strike threshold.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { listDeviceBans, manualBanDevice } from "@/lib/gatekeeper";

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
    const triggerEventType = searchParams.get("triggerEventType") ?? undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    const result = await listDeviceBans({ page, limit, triggerEventType, isActive, dateFrom, dateTo });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Device ban list retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/gatekeeper/bans GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load device bans. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin || admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to perform this action." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const deviceFingerprint = typeof body?.deviceFingerprint === "string" ? body.deviceFingerprint.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!deviceFingerprint || !reason) {
      return NextResponse.json(
        { success: false, data: null, message: "A device fingerprint and reason are both required." },
        { status: 400 }
      );
    }

    const result = await manualBanDevice({
      deviceFingerprint,
      reason,
      bannedByEmail: admin.email ?? admin.id,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, data: null, message: result.message }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      data: { banId: result.banId },
      message: "Device banned successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/gatekeeper/bans POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't ban this device. Please try again." },
      { status: 500 }
    );
  }
}
