/**
 * FILE: app/api/superadmin/products/[productId]/approve/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/backups/route.ts and
 * app/api/superadmin/admin-management/[adminId]/route.ts.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 9.2 — approves a
 * product a regular admin submitted for review, flipping its status
 * from "pending-review" to "published" so it goes live on the
 * storefront. Task-111, 3rd of the 4-task split (task-109 schema →
 * task-110 admin write routes → this → task-112 UI).
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Load the product — 404 if missing or soft-deleted (Rule 6),
 *    same not-found handling as the admin product routes.
 * 3. 409 if the product isn't currently "pending-review" — this
 *    route only ever moves a product out of review, never approves
 *    an already-published or still-draft row.
 * 4. Flip status to "published", record who approved it via
 *    updatedBy.
 * 5. Write an AuditLog row (action: "updated", changes: only the
 *    status field) via lib/auditLog.ts — the same audit trail the
 *    admin product create/edit/delete routes already use, so this
 *    doesn't introduce a second logging path for the same entity.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { recordAuditLog, diffProductFields } from "@/lib/auditLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that product." },
        { status: 404 }
      );
    }

    // Only a pending-review product can be approved — an already
    // published or still-draft row is left untouched (409), never
    // silently flipped.
    if (existing.status !== "pending-review") {
      return NextResponse.json(
        { success: false, data: null, message: "This product isn't awaiting review." },
        { status: 409 }
      );
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "published",
        updatedBy: admin.email ?? "unknown",
      },
    });

    const changes = diffProductFields(
      { status: existing.status },
      { status: updated.status }
    );

    await recordAuditLog({
      entityType: "product",
      entityId: updated.id,
      actor: admin.email ?? "unknown",
      action: "updated",
      changes,
      note: "Approved from pending review.",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Product approved and now live.",
    });
  } catch (error) {
    console.error("[api/superadmin/products/[productId]/approve PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't approve this product. Please try again." },
      { status: 500 }
    );
  }
}
