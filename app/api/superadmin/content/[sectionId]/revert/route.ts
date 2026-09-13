/**
 * FILE: app/api/superadmin/content/[sectionId]/revert/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the parent content routes.
 *
 * PURPOSE:
 * task-114 (Section 3.7, 9.3), revert variant. Takes a `versionId`
 * belonging to this section and restores that snapshot's `data` onto
 * the live ContentSection row. Revert is never destructive: the
 * section's data immediately before the revert is itself snapshotted
 * into a NEW ContentVersion row first, so reverting can always be
 * undone by reverting again to the pre-revert snapshot.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Look up the target ContentSection by id — 404 if missing.
 * 3. Look up the ContentVersion by the body's `versionId`, scoped to
 *    this section (a versionId from a different section must never
 *    resolve here) — 404 if missing or mismatched.
 * 4. Snapshot the section's CURRENT data into a new ContentVersion
 *    row (same non-destructive pattern as the PUT route), then prune
 *    beyond the 5-row cap (Section 9.3, lib/contentVersions.ts).
 * 5. Overwrite the ContentSection row's `data` with the old version's
 *    snapshot (updatedBy = calling admin's email).
 * 6. Log `content_reverted` to SecurityLog (Rule 38) naming the
 *    section and which version was restored.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { logSecurityEvent } from "@/lib/securityLog";
import { pruneOldVersions } from "@/lib/contentVersions";

interface RevertContentSectionBody {
  versionId?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
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

    const body: RevertContentSectionBody = await request.json();
    if (!body.versionId) {
      return NextResponse.json(
        { success: false, data: null, message: "Please choose a version to restore." },
        { status: 400 }
      );
    }

    // Scoped to this section so a versionId belonging to a different
    // section can never be used to pull unrelated data into this one.
    const targetVersion = await prisma.contentVersion.findFirst({
      where: { id: body.versionId, sectionId: section.id },
    });
    if (!targetVersion) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that version. It may have already been pruned." },
        { status: 404 }
      );
    }

    // Snapshot the CURRENT (pre-revert) data first — makes the revert
    // itself reversible, same non-destructive guarantee as a publish.
    await prisma.contentVersion.create({
      data: {
        sectionId: section.id,
        data: section.data as Record<string, unknown>,
        savedBy: admin.email,
      },
    });

    const restored = await prisma.contentSection.update({
      where: { id: section.id },
      data: {
        data: targetVersion.data as Record<string, unknown>,
        updatedBy: admin.email,
      },
    });

    await pruneOldVersions(section.id);

    await logSecurityEvent({
      eventType: "content_reverted",
      actor: admin.email,
      request,
      details: `Content section "${section.label}" reverted to version saved ${targetVersion.createdAt.toISOString()}`,
    });

    return NextResponse.json({
      success: true,
      data: restored,
      message: "Content section reverted successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/content/[sectionId]/revert POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't revert this content section. Please try again." },
      { status: 500 }
    );
  }
}
