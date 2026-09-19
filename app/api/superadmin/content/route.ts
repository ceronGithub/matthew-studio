/**
 * FILE: app/api/superadmin/content/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as app/api/superadmin/content/[sectionId]/route.ts.
 *
 * PURPOSE:
 * task-114 (Section 3.7) — GET returns every ContentSection row
 * (id, sectionKey, label, updatedAt only — never the full `data`
 * blob, which is fetched per-section by [sectionId]'s GET once the
 * super-admin picks one) for the /superAdmin/content section tree
 * (task-115).
 *
 * FIX NOTE (2026-09-20): this file was previously a byte-for-byte
 * duplicate of [sectionId]/route.ts — it destructured a `sectionId`
 * route param that doesn't exist at this path, so it always threw at
 * runtime, and no `findMany()` existed anywhere in the codebase.
 * Flagged and logged in docs/openFindings.md while spot-checking
 * task-115's `needs: task-114` (Rule 49.2 §3). Replaced with the
 * list behavior task-114's own spec already called for — no new
 * scope introduced.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";

export async function GET(request: Request) {
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

    // Only the section-tree fields — the form panel's full `data`
    // payload is fetched separately, per section, via GET
    // /api/superadmin/content/[sectionId] once one is selected.
    const sections = await prisma.contentSection.findMany({
      select: { id: true, sectionKey: true, label: true, updatedAt: true },
      orderBy: { sectionKey: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { sections },
      message: "Content sections retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/content GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load the content sections. Please try again." },
      { status: 500 }
    );
  }
}
