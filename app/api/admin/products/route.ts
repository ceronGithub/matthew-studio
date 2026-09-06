/**
 * FILE: app/api/admin/products/route.ts
 * ROLE: Admin/super-admin only, gated on the "manage-products"
 * permission — self-checked via getSessionAdmin() + hasAdminPermission()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.2.1 — paginated product
 * list for the admin product management table. Task 20 (read-only):
 * list + detail routes only, no create/update/delete (Task 21).
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Check "manage-products" via hasAdminPermission(); 403 if missing.
 * 3. Read page/category/status/search query params, build a Prisma
 *    where clause (deletedAt: null always, per Rule 6 soft delete).
 * 4. Return a paginated page of products, newest createdAt first.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";

const PAGE_SIZE = 25;
const VALID_STATUSES = ["draft", "published"];

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!(await hasAdminPermission(admin, "manage-products"))) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to manage products." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const category = searchParams.get("category") ?? undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;
    const search = searchParams.get("search")?.trim();

    // Rule 6 soft delete — never list deleted products here.
    const where = {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          category: true,
          categoryLabel: true,
          startingPrice: true,
          status: true,
          badge: true,
          createdAt: true,
          updatedAt: true,
          coverImageUrl: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Product list retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/products GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load products. Please try again." },
      { status: 500 }
    );
  }
}
