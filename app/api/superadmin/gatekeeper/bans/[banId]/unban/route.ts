/**
 * FILE: app/api/superadmin/gatekeeper/bans/[banId]/unban/route.ts
 * ROLE: Super-admin only — gatekeeper_specification.md Section 9.
 *
 * PURPOSE:
 * The only way any device ban is lifted (Section 8). Requires a
 * non-empty unbanNote — Rule 34.4's confirmation-modal discipline for
 * destructive/security-sensitive actions applies here too, just in
 * reverse (lifting a security restriction is as sensitive as
 * imposing one).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { unbanDevice } from "@/lib/gatekeeper";

export async function PUT(request: Request, { params }: { params: Promise<{ banId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin || admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to perform this action." },
        { status: 403 }
      );
    }

    const { banId } = await params;
    const body = await request.json().catch(() => null);
    const unbanNote = typeof body?.unbanNote === "string" ? body.unbanNote : "";

    const result = await unbanDevice({
      banId,
      unbanNote,
      unbannedByEmail: admin.email ?? admin.id,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, data: null, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { banId, isActive: false },
      message: "Device unbanned successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/gatekeeper/bans/[banId]/unban PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't unban this device. Please try again." },
      { status: 500 }
    );
  }
}
