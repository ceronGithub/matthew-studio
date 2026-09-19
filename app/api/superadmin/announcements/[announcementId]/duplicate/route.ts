/**
 * FILE: app/api/superadmin/announcements/[announcementId]/duplicate/route.ts
 * ROLE: Super-admin only.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.9 — "Duplicate"
 * action. Clones an existing announcement as a new draft row so a
 * super-admin can reuse a past announcement's copy without editing
 * the original.
 *
 * DATA FLOW:
 * 1. CSRF check, then auth check.
 * 2. Load the source row (404 if missing/deleted).
 * 3. Create a new row: same message/placement/publishAt/expiresAt,
 *    title suffixed " (Copy)", status forced back to "draft"
 *    regardless of the source's status — a duplicate is never live
 *    on creation.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const admin = await getSessionAdmin(request);
    if (!admin || admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to duplicate announcements." },
        { status: 403 }
      );
    }

    const { announcementId } = await params;

    const source = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!source || source.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that announcement." },
        { status: 404 }
      );
    }

    const duplicate = await prisma.announcement.create({
      data: {
        title: `${source.title} (Copy)`,
        message: source.message,
        placement: source.placement,
        status: "draft",
        publishAt: source.publishAt,
        expiresAt: source.expiresAt,
        createdBy: admin.email ?? "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      data: duplicate,
      message: "Announcement duplicated successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements/[announcementId]/duplicate POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't duplicate the announcement. Please try again." },
      { status: 500 }
    );
  }
}
