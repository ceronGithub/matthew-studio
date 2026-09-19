/**
 * FILE: app/api/superadmin/content/[sectionId]/versions/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the other content routes.
 *
 * PURPOSE:
 * task-115 (Section 3.7's "Revert to last published — lists the
 * section's version history") — GET returns this section's
 * ContentVersion rows (id, createdAt, savedBy only, never the `data`
 * snapshot itself) so the UI can list up to 5 versions to revert to.
 * Not part of task-114's original 4 endpoints; added here because
 * task-115's Revert feature cannot exist without it — the existing
 * revert POST already takes a versionId, but nothing exposed which
 * versionIds are available to pick from.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Confirm the section exists — 404 if not.
 * 3. Return its ContentVersion rows, newest first, capped at
 *    MAX_VERSIONS_PER_SECTION (lib/contentVersions.ts) — matches the
 *    same cap the PUT/revert routes already prune down to, so the
 *    list can never show more than what a revert could actually
 *    target.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { MAX_VERSIONS_PER_SECTION } from "@/lib/contentVersions";

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

    const section = await prisma.contentSection.findUnique({ where: { id: sectionId }, select: { id: true } });
    if (!section) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that content section. It may have been removed." },
        { status: 404 }
      );
    }

    const versions = await prisma.contentVersion.findMany({
      where: { sectionId },
      select: { id: true, createdAt: true, savedBy: true },
      orderBy: { createdAt: "desc" },
      take: MAX_VERSIONS_PER_SECTION,
    });

    return NextResponse.json({
      success: true,
      data: { versions },
      message: "Version history retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/content/[sectionId]/versions GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load version history. Please try again." },
      { status: 500 }
    );
  }
}
