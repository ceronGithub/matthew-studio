/**
 * FILE: app/api/superadmin/announcements/[announcementId]/route.ts
 * ROLE: Super-admin only.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.9 — edit (PUT) and
 * soft delete (DELETE) for a single announcement.
 *
 * DATA FLOW (PUT):
 * 1. CSRF check, then auth check.
 * 2. Load the existing row (404 if missing/deleted).
 * 3. Validate + clean the body via validateAnnouncementInput().
 * 4. Update the row, set updatedBy = admin.email.
 * 5. If the status transitions INTO "live" (wasn't live before, is
 *    now), log "announcement_published". Editing a row that was
 *    already live and stays live does not re-log a publish event.
 *
 * DATA FLOW (DELETE):
 * 1. CSRF check, then auth check.
 * 2. Soft delete only — sets deletedAt (Rule 6), never a hard
 *    Prisma .delete(). 404 if already deleted/missing. The 5-second
 *    confirmation delay (Rule 34.4 / ConfirmationModal's
 *    confirmDelaySeconds) is a UI-layer concern — task-118's job,
 *    not this route's.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";
import { validateAnnouncementInput } from "@/lib/adminAnnouncementValidation";

export async function PUT(
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
        { success: false, data: null, message: "You don't have permission to edit announcements." },
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

    const body = await request.json();
    const { cleaned, errors } = validateAnnouncementInput(body);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, data: null, message: errors[0].message, error: JSON.stringify(errors) },
        { status: 400 }
      );
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: cleaned.title,
        message: cleaned.message,
        placement: cleaned.placement,
        status: cleaned.status,
        publishAt: cleaned.publishAt as Date,
        expiresAt: cleaned.expiresAt,
        updatedBy: admin.email ?? "unknown",
      },
    });

    // Only log a publish event on the transition into "live" — an
    // edit that keeps an already-live announcement live isn't a new
    // publish per Section 3.9's Security Logs callout.
    if (existing.status !== "live" && updated.status === "live") {
      await logSecurityEvent({
        eventType: "announcement_published",
        actor: admin.email,
        request,
        details: `${updated.title} (${updated.placement})`,
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Announcement saved successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements/[announcementId] PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save the announcement. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { success: false, data: null, message: "You don't have permission to delete announcements." },
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

    // Rule 6 soft delete — never a hard .delete().
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Announcement deleted successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements/[announcementId] DELETE] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't delete the announcement. Please try again." },
      { status: 500 }
    );
  }
}
