/**
 * FILE: app/api/superadmin/content/[sectionId]/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the list route in the parent folder.
 *
 * PURPOSE:
 * task-114 (Section 3.7, 9.3), detail + publish variant.
 * GET returns the full ContentSection row (including its current
 * `data`) for the super-admin's form panel. PUT validates and saves a
 * new `data` payload: before overwriting, it snapshots the *current*
 * `data` into a new ContentVersion row, then prunes the oldest
 * version(s) for that section beyond 5 (Section 9.3's version-history
 * cap), then logs `content_updated` to SecurityLog (Rule 38) naming
 * the section and which top-level fields changed.
 *
 * DATA FLOW (GET):
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. prisma.contentSection.findUnique() by id — 404 if it doesn't
 *    exist.
 *
 * DATA FLOW (PUT):
 * 1. Same auth/lookup as GET.
 * 2. Validate the request body's `data` field is present and is a
 *    plain JSON object (never an array or a primitive — a content
 *    section's data is always a keyed object per Section 9.3's own
 *    examples).
 * 3. Snapshot the section's CURRENT `data` into a new ContentVersion
 *    row (savedBy = calling admin's email) — this preserves the
 *    pre-update state, never the new one.
 * 4. Overwrite the ContentSection row's `data` with the validated
 *    payload (updatedBy = calling admin's email).
 * 5. Prune: count ContentVersion rows for this section; if more than
 *    5 remain, delete the oldest ones beyond that cap (Section 9.3).
 * 6. Log `content_updated` to SecurityLog with the section's label
 *    and the list of top-level fields that changed (lib/auditLog.ts's
 *    diffJsonFields, generalized from diffProductFields for
 *    arbitrary/nested JSON) — never the full before/after payload,
 *    same "don't bloat SecurityLog.details" discipline as every other
 *    admin-mutation route in this codebase.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { logSecurityEvent } from "@/lib/securityLog";
import { diffJsonFields } from "@/lib/auditLog";
import { pruneOldVersions } from "@/lib/contentVersions";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
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

    const { sectionId } = await params;

    const section = await prisma.contentSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that content section. It may have been removed." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: section,
      message: "Content section retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/content/[sectionId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load this content section. Please try again." },
      { status: 500 }
    );
  }
}

interface UpdateContentSectionBody {
  data?: unknown;
}

export async function PUT(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
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

    const { sectionId } = await params;

    const section = await prisma.contentSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that content section. It may have been removed." },
        { status: 404 }
      );
    }

    const body: UpdateContentSectionBody = await request.json();

    if (!isPlainObject(body.data)) {
      return NextResponse.json(
        { success: false, data: null, message: "Section data must be a valid object." },
        { status: 400 }
      );
    }
    const newData = body.data;
    const previousData = section.data as Record<string, unknown>;

    // Snapshot the CURRENT data before it's overwritten — revert
    // always restores to a state that existed before some publish,
    // never the state being published right now.
    await prisma.contentVersion.create({
      data: {
        sectionId: section.id,
        data: previousData,
        savedBy: admin.email,
      },
    });

    const updated = await prisma.contentSection.update({
      where: { id: section.id },
      data: {
        data: newData,
        updatedBy: admin.email,
      },
    });

    await pruneOldVersions(section.id);

    const changedFields = diffJsonFields(previousData, newData);
    await logSecurityEvent({
      eventType: "content_updated",
      actor: admin.email,
      request,
      details: `Content section "${section.label}" published${
        changedFields.length ? `: ${changedFields.join(", ")} changed` : " (no field-level changes detected)"
      }`,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Content section published successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/content/[sectionId] PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't publish this content section. Please try again." },
      { status: 500 }
    );
  }
}
