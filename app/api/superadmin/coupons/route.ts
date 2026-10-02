/**
 * FILE: app/api/superadmin/coupons/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same guard as
 * app/api/superadmin/announcements/route.ts. Ordinary admins cannot manage
 * coupons (decision confirmed for v1).
 *
 * PURPOSE:
 * additional_platform_gaps_specification.md Section 4.1 (admin side) —
 * paginated coupon list (GET) and coupon create (POST) for the future
 * super-admin coupons page (task-54g).
 *
 * DATA FLOW (GET):
 * 1. Auth check (superAdmin only).
 * 2. Read page / limit / status / search from the query string.
 * 3. Query coupons, newest first. Coupons are never hard-deleted, so every
 *    row ever created is listed — switched-off ones show isActive: false.
 *
 * DATA FLOW (POST):
 * 1. CSRF check, then the same auth check as GET.
 * 2. Validate the body with createCouponSchema (lib/couponValidation.ts) —
 *    this also trims and upper-cases the code.
 * 3. Duplicate check on the normalized code -> 409 (Rule 6). The database
 *    @unique constraint is the backup if two requests race.
 * 4. Create the row and write an audit entry (Rule 6).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { recordAuditLog } from "@/lib/auditLog";
import { createCouponSchema } from "@/lib/couponValidation";

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

    // "active" / "inactive" filter the on/off switch; anything else shows all.
    const rawStatus = searchParams.get("status");
    const isActiveFilter =
      rawStatus === "active" ? true : rawStatus === "inactive" ? false : undefined;

    // Codes are stored upper-case, so the search term is upper-cased to match.
    const search = searchParams.get("search")?.trim().toUpperCase();

    const where = {
      ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
      ...(search ? { code: { contains: search } } : {}),
    };

    const [coupons, totalCount] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        coupons,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        page,
      },
      message: "Coupons retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/coupons GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load coupons. Please try again." },
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
        { success: false, data: null, message: "You don't have permission to create coupons." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = createCouponSchema.safeParse(body);

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

    // Rule 6 duplicate check on the already-normalized (trimmed, upper-case) code.
    const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `A coupon with the code "${input.code}" already exists.`,
          error: "Duplicate field: code",
        },
        { status: 409 }
      );
    }

    let created;
    try {
      created = await prisma.coupon.create({
        data: {
          code: input.code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          usageLimit: input.usageLimit,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          scopeCategory: input.scopeCategory,
        },
      });
    } catch (createError) {
      // Database unique constraint (P2002) — another request created the same
      // code between our duplicate check and this insert.
      if ((createError as { code?: string }).code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: `A coupon with the code "${input.code}" already exists.`,
            error: "Duplicate field: code",
          },
          { status: 409 }
        );
      }
      throw createError;
    }

    await recordAuditLog({
      entityType: "coupon",
      entityId: created.id,
      actor: admin.email ?? "unknown",
      action: "created",
      changes: {
        code: { before: null, after: created.code },
        discountType: { before: null, after: created.discountType },
        discountValue: { before: null, after: created.discountValue },
        usageLimit: { before: null, after: created.usageLimit },
        expiresAt: { before: null, after: created.expiresAt?.toISOString() ?? null },
        scopeCategory: { before: null, after: created.scopeCategory },
      },
      note: `Coupon ${created.code} created.`,
    });

    return NextResponse.json(
      { success: true, data: created, message: `Coupon ${created.code} created successfully.` },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/superadmin/coupons POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't create the coupon. Please try again." },
      { status: 500 }
    );
  }
}
