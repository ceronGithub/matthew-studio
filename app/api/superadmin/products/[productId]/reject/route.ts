/**
 * FILE: app/api/superadmin/products/[productId]/reject/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as its approve/route.ts sibling.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 9.2 — rejects a
 * product a regular admin submitted for review, returning it to
 * "draft" so the original admin can revise and resubmit. Never
 * deletes the product. Task-111, 3rd of the 4-task split.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Load the product — 404 if missing or soft-deleted (Rule 6).
 * 3. 409 if the product isn't currently "pending-review" — same
 *    guard as approve/route.ts, mirrored for the opposite action.
 * 4. Flip status back to "draft", record who rejected it via
 *    updatedBy.
 * 5. Write an AuditLog row (action: "updated", changes: only the
 *    status field) via lib/auditLog.ts — same audit trail the admin
 *    product create/edit/delete routes already use.
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

    // Only a pending-review product can be rejected — same 409 guard
    // as approve/route.ts, mirrored for the opposite direction.
    if (existing.status !== "pending-review") {
      return NextResponse.json(
        { success: false, data: null, message: "This product isn't awaiting review." },
        { status: 409 }
      );
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "draft",
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
      note: "Rejected from pending review — returned to draft.",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Product rejected and returned to draft.",
    });
  } catch (error) {
    console.error("[api/superadmin/products/[productId]/reject PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't reject this product. Please try again." },
      { status: 500 }
    );
  }
}
