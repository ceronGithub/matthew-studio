/**
 * FILE: app/api/superadmin/announcements/[announcementId]/deactivate/route.ts
 * ROLE: Super-admin only.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.9 — "Deactivate
 * early" action. Manually ends a live (or scheduled) announcement
 * ahead of its expiresAt by setting status to "expired" directly —
 * distinct from a normal auto-expiry, which task-118's storefront
 * consumer handles by simply not rendering a row whose expiresAt has
 * passed.
 *
 * DATA FLOW:
 * 1. CSRF check, then auth check.
 * 2. Load the row (404 if missing/deleted).
 * 3. 400 if already "expired" — deactivating an already-expired
 *    announcement is a no-op the UI shouldn't be offering.
 * 4. Set status: "expired", updatedBy = admin.email.
 * 5. Log eventType: "announcement_deactivated" to SecurityLog
 *    (Rule 38) with details: title + placement, per Section 3.9's
 *    Security Logs callout.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";

export async function PATCH(
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
        { success: false, data: null, message: "You don't have permission to deactivate announcements." },
        { status: 403 }
      );
    }

    const { announcementId } = await params;

    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that announcement." },
        { status: 404 }
      );
    }

    if (existing.status === "expired") {
      return NextResponse.json(
        { success: false, data: null, message: "This announcement has already ended." },
        { status: 400 }
      );
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { status: "expired", updatedBy: admin.email ?? "unknown" },
    });

    await logSecurityEvent({
      eventType: "announcement_deactivated",
      actor: admin.email,
      request,
      details: `${updated.title} (${updated.placement})`,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Announcement deactivated successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements/[announcementId]/deactivate PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't deactivate the announcement. Please try again." },
      { status: 500 }
    );
  }
}
