/**
 * FILE: app/api/admin/products/[productId]/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products" —
 * self-checked via getSessionAdmin() + hasAdminPermission().
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.2.2 — full product detail
 * (all fields incl. galleryImages) for the edit form (Task 23) and
 * the read-only preview view. Task 20 (read-only) — the PUT/DELETE
 * counterparts for this same path are Task 21.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";

export async function GET(
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

    if (!(await hasAdminPermission(admin, "manage-products"))) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to manage products." },
        { status: 403 }
      );
    }

    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        galleryImages: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Rule 6 soft delete — a deleted product 404s the same as a
    // never-existed one; admins recover via the DB, not this route.
    if (!product || product.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that product." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: "Product retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/products/[productId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load that product. Please try again." },
      { status: 500 }
    );
  }
}
