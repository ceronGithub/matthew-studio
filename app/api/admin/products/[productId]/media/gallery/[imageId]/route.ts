/**
 * FILE: app/api/admin/products/[productId]/media/gallery/[imageId]/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products".
 *
 * PURPOSE:
 * Task 25 — remove a single gallery image
 * (product_media_upload_specification.md Sections 2.2, 3, 6, 7, 8).
 *
 * DATA FLOW:
 * 1. CSRF + getSessionAdmin() + hasAdminPermission(admin,
 *    "manage-products") — same 3 checks as the sibling POST route.
 * 2. Load the ProductGalleryImage row scoped to BOTH imageId AND
 *    productId — 404 if it doesn't exist or belongs to a different
 *    product (never trust imageId alone; that would let an admin
 *    delete another product's gallery row by guessing an ID).
 * 3. Delete the R2 object first, then the DB row — if R2 deletion
 *    fails, log it but still remove the DB row so the UI doesn't get
 *    stuck showing a broken reference (same never-break-the-request
 *    spirit as the rest of this codebase's storage helpers).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { deleteFromR2 } from "@/services/r2";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "You must be signed in as an admin to do this." },
        { status: 401 }
      );
    }

    const allowed = await hasAdminPermission(admin, "manage-products");
    if (!allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to manage products." },
        { status: 403 }
      );
    }

    const { productId, imageId } = await params;
    const galleryImage = await prisma.productGalleryImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!galleryImage) {
      return NextResponse.json(
        { success: false, data: null, message: "Gallery image not found." },
        { status: 404 }
      );
    }

    await deleteFromR2(galleryImage.key).catch((error) =>
      console.error("[api/admin/products/media/gallery/[imageId]] Failed to delete R2 object:", error)
    );

    await prisma.productGalleryImage.delete({ where: { id: imageId } });
    await prisma.product.update({ where: { id: productId }, data: { updatedBy: admin.email } });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Image removed.",
    });
  } catch (error) {
    console.error("[api/admin/products/media/gallery/[imageId]] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Failed to remove image. Please try again." },
      { status: 500 }
    );
  }
}
