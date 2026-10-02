/**
 * FILE: app/api/superadmin/coupons/[couponId]/route.ts
 * ROLE: Super-admin only.
 *
 * PURPOSE:
 * additional_platform_gaps_specification.md Section 4.1 (admin side) —
 * change one coupon: switch it on or off, change its usage limit, or change
 * its expiry. Nothing else can change (code, type, value and category are
 * locked because past orders may have used them). There is no DELETE:
 * coupons are only ever switched off, never removed, so the history of
 * orders that used them stays intact.
 *
 * DATA FLOW (PATCH):
 * 1. CSRF check, then auth check (superAdmin only).
 * 2. Load the coupon (404 if missing).
 * 3. Validate the body with updateCouponSchema (lib/couponValidation.ts).
 * 4. A new usage limit can't be lower than the redemptions already used.
 * 5. Update only the fields that were sent.
 * 6. Write an audit entry listing what changed (Rule 6).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { recordAuditLog } from "@/lib/auditLog";
import { updateCouponSchema } from "@/lib/couponValidation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
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
        { success: false, data: null, message: "You don't have permission to change coupons." },
        { status: 403 }
      );
    }

    const { couponId } = await params;

    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that coupon." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = updateCouponSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsedBody.error.issues[0]?.message ?? "Check the coupon details and try again.",
          error: JSON.stringify(parsedBody.error.issues),
        },
        { status: 400 }
      );
    }

    const input = parsedBody.data;

    // Lowering the limit below what buyers have already redeemed would make
    // the numbers on the coupon page contradict each other.
    if (typeof input.usageLimit === "number" && input.usageLimit < existing.usageCount) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `This coupon has already been used ${existing.usageCount} times, so the limit can't be lower than that.`,
          error: "usageLimit below usageCount",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
        ...(input.expiresAt !== undefined
          ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
          : {}),
      },
    });

    // Only record fields that really changed. Dates are compared as ISO text
    // because two Date objects are never === even when they are the same moment.
    const before = {
      isActive: existing.isActive,
      usageLimit: existing.usageLimit,
      expiresAt: existing.expiresAt?.toISOString() ?? null,
    };
    const after = {
      isActive: updated.isActive,
      usageLimit: updated.usageLimit,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    };

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    (Object.keys(after) as Array<keyof typeof after>).forEach((field) => {
      if (before[field] !== after[field]) {
        changes[field] = { before: before[field], after: after[field] };
      }
    });

    if (Object.keys(changes).length > 0) {
      await recordAuditLog({
        entityType: "coupon",
        entityId: updated.id,
        actor: admin.email ?? "unknown",
        action: "updated",
        changes,
        note: `Coupon ${updated.code} updated.`,
      });
    }

    const message =
      input.isActive === false && existing.isActive
        ? `Coupon ${updated.code} switched off.`
        : input.isActive === true && !existing.isActive
          ? `Coupon ${updated.code} switched on.`
          : `Coupon ${updated.code} updated successfully.`;

    return NextResponse.json({ success: true, data: updated, message });
  } catch (error) {
    console.error("[api/superadmin/coupons/[couponId] PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update the coupon. Please try again." },
      { status: 500 }
    );
  }
}
