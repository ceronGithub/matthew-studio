/**
 * FILE: app/api/superadmin/announcements/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/products/route.ts and
 * app/api/superadmin/content/route.ts.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.9 — paginated
 * announcement list (GET) and create (POST), for the
 * /superAdmin/announcements page (task-118).
 *
 * DATA FLOW (GET):
 * 1. Auth check (superAdmin only).
 * 2. Read page/limit/status/search from the query string.
 * 3. Query non-deleted announcements (Rule 6), paginated + filtered,
 *    newest-updated first.
 *
 * DATA FLOW (POST):
 * 1. CSRF check, then the same auth check as GET.
 * 2. Validate + clean the body via validateAnnouncementInput().
 * 3. Create the row, set createdBy = admin.email.
 * 4. If the resolved status is "live", log
 *    eventType: "announcement_published" to SecurityLog (Rule 38)
 *    with details: title + placement, per Section 3.9's own
 *    Security Logs callout. A draft/scheduled create is not a
 *    publish event — only "live" is.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";
import { validateAnnouncementInput, VALID_STATUSES } from "@/lib/adminAnnouncementValidation";

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

    const rawStatus = searchParams.get("status");
    const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;

    const search = searchParams.get("search")?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        announcements,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        page,
      },
      message: "Announcements retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load announcements. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { success: false, data: null, message: "You don't have permission to create announcements." },
        { status: 403 }
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

    const created = await prisma.announcement.create({
      data: {
        title: cleaned.title,
        message: cleaned.message,
        placement: cleaned.placement,
        status: cleaned.status,
        publishAt: cleaned.publishAt as Date,
        expiresAt: cleaned.expiresAt,
        createdBy: admin.email ?? "unknown",
      },
    });

    // Section 3.9's Security Logs callout: only a "live" announcement
    // counts as published — a draft/scheduled create is silent here.
    if (created.status === "live") {
      await logSecurityEvent({
        eventType: "announcement_published",
        actor: admin.email,
        request,
        details: `${created.title} (${created.placement})`,
      });
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: "Announcement created successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/announcements POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't create the announcement. Please try again." },
      { status: 500 }
    );
  }
}
