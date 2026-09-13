/**
 * FILE: app/api/superadmin/products/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/backups/route.ts and
 * app/api/superadmin/admin-management/route.ts.
 *
 * PURPOSE:
 * GET — paginated, status-filterable Product list for the
 * /superAdmin/products page (task-112), defaulting to the
 * "pending-review" filter per super_admin_account_specification.md
 * Section 9.2's own filter callout. This is a new, superAdmin-scoped
 * route rather than reusing GET /api/admin/products — that route is
 * gated on "manage-products" permission (any admin), while this list
 * is the super-admin's own review queue and stays on its own route
 * tree, same relationship as buyer-management (task-107) has to
 * /admin/users.
 *
 * Never a POST/PUT/DELETE here — creation/editing stays on
 * /api/admin/products, approval/rejection stays on
 * /api/superadmin/products/[productId]/approve|reject (task-111).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";

const PAGE_SIZE = 25;
const VALID_STATUS_FILTERS = ["pending-review", "draft", "published"];

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

    // Defaults to "pending-review" — the spec's own review-queue
    // callout — but an empty string param means "all statuses".
    const rawStatus = searchParams.get("status");
    const status =
      rawStatus === null
        ? "pending-review"
        : rawStatus && VALID_STATUS_FILTERS.includes(rawStatus)
        ? rawStatus
        : undefined;

    const search = searchParams.get("search")?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          categoryLabel: true,
          startingPrice: true,
          status: true,
          createdBy: true,
          updatedBy: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        page,
      },
      message: "Products retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/products GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load products. Please try again." },
      { status: 500 }
    );
  }
}
