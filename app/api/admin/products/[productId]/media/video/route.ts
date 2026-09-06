/**
 * FILE: app/api/admin/products/[productId]/media/video/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products".
 *
 * PURPOSE:
 * Task 26 — preview video upload/removal for a product
 * (product_media_upload_specification.md Sections 2.3, 3, 5, 6, 7, 8).
 * No processImage() here — Sharp cannot process video (Section 7's
 * explicit warning) — the raw file goes straight to uploadToR2()
 * after validation.
 *
 * DATA FLOW (POST):
 * 1. CSRF + getSessionAdmin() + hasAdminPermission(admin,
 *    "manage-products") — same 3 checks as Tasks 24/25.
 * 2. Load the product (404 if missing/soft-deleted).
 * 3. Validate type (mp4/webm/quicktime) and size (<=100MB, per
 *    Section 2.3's flagged assumption, used as given).
 * 4. Upload to products/<productId>/video/<uuid>.<ext> — original
 *    extension kept, never converted (Section 3).
 * 5. If previewVideoKey already exists, delete the old R2 object
 *    first (Section 7 — old files deleted before the replacement is
 *    written).
 * 6. Update Product.previewVideoUrl/previewVideoKey.
 *
 * DATA FLOW (DELETE):
 * Same 3 checks, deletes the R2 object, nulls out both fields. No
 * toast text is specified in Section 8 for plain removal (only
 * upload is listed there) — uses the Rule 22.3 generic pattern.
 *
 * DELIBERATE DEVIATION FROM SPEC (noted, not silently followed):
 * Section 5 also describes wiping the entire products/<productId>/
 * R2 prefix when a product is deleted. This codebase's product
 * DELETE (Task 21) is a Rule 6 SOFT delete (deletedAt, row kept) —
 * destroying R2 media at that point would defeat the whole point of
 * a soft delete being recoverable. Media is left in place on
 * soft-delete; an eventual hard-delete/cleanup pass, not this task,
 * would be the right place to purge R2.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/services/prisma";
import { getSessionAdmin, type SessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { uploadToR2, deleteFromR2 } from "@/services/r2";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB, Section 2.3

// Original extension is kept on upload (Section 3) — never converted,
// unlike images which always become .webp.
const ACCEPTED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

async function authorizeRequest(request: Request): Promise<NextResponse | SessionAdmin> {
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

  return admin;
}

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const auth = await authorizeRequest(request);
    if (auth instanceof NextResponse) return auth;
    const admin = auth;

    const { productId } = await params;
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) {
      return NextResponse.json(
        { success: false, data: null, message: "Product not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, data: null, message: "No file provided." }, { status: 400 });
    }
    const extension = ACCEPTED_VIDEO_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { success: false, data: null, message: "Only MP4, WebM, and QuickTime (.mov) videos are accepted." },
        { status: 400 }
      );
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, data: null, message: "Video is too large. Maximum size is 100MB." },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const fileKey = `products/${productId}/video/${randomUUID()}.${extension}`;
    const publicUrl = await uploadToR2(fileKey, rawBuffer, file.type);

    // Old files deleted before the replacement is written (Section 7).
    if (product.previewVideoKey) {
      await deleteFromR2(product.previewVideoKey).catch((error) =>
        console.error("[api/admin/products/media/video] Failed to delete previous video:", error)
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: { previewVideoUrl: publicUrl, previewVideoKey: fileKey, updatedBy: admin.email },
    });

    return NextResponse.json({
      success: true,
      data: { previewVideoUrl: publicUrl },
      message: "Preview video uploaded.",
    });
  } catch (error) {
    console.error("[api/admin/products/media/video] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Video upload failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const auth = await authorizeRequest(request);
    if (auth instanceof NextResponse) return auth;
    const admin = auth;

    const { productId } = await params;
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) {
      return NextResponse.json(
        { success: false, data: null, message: "Product not found." },
        { status: 404 }
      );
    }

    if (product.previewVideoKey) {
      await deleteFromR2(product.previewVideoKey).catch((error) =>
        console.error("[api/admin/products/media/video] Failed to delete video on removal:", error)
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: { previewVideoUrl: null, previewVideoKey: null, updatedBy: admin.email },
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Preview video removed.",
    });
  } catch (error) {
    console.error("[api/admin/products/media/video] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Failed to remove video. Please try again." },
      { status: 500 }
    );
  }
}
