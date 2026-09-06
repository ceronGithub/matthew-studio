/**
 * FILE: app/api/admin/products/[productId]/media/gallery/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products".
 *
 * PURPOSE:
 * Task 25 — add a gallery image to a product
 * (product_media_upload_specification.md Sections 2.2, 3, 6, 7, 8).
 * Same validate→processImage()→uploadToR2() pipeline as Task 24's
 * cover route, but the key is randomized per image (only the cover
 * uses a fixed filename — Section 3) and rows are capped at 8.
 *
 * DATA FLOW:
 * 1. CSRF + getSessionAdmin() + hasAdminPermission(admin,
 *    "manage-products") — same 3 checks as every other product route.
 * 2. Load the product (404 if missing/soft-deleted).
 * 3. Reject with a clear message if the product already has 8
 *    ProductGalleryImage rows (Section 2.2's cap).
 * 4. Validate type/size, process the image, upload to
 *    products/<productId>/gallery/<uuid>.webp.
 * 5. Create the ProductGalleryImage row with sortOrder = current
 *    count, so new images append to the end of the strip.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { processImage } from "@/lib/imageProcessor";
import { uploadToR2 } from "@/services/r2";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_GALLERY_IMAGES = 8;

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
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

    const { productId } = await params;
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) {
      return NextResponse.json(
        { success: false, data: null, message: "Product not found." },
        { status: 404 }
      );
    }

    const existingCount = await prisma.productGalleryImage.count({ where: { productId } });
    if (existingCount >= MAX_GALLERY_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `This product already has the maximum of ${MAX_GALLERY_IMAGES} gallery images. Remove one before adding another.`,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, data: null, message: "No file provided." }, { status: 400 });
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, data: null, message: "Only JPEG, PNG, WebP, and GIF files are accepted." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, data: null, message: "File is too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await processImage(rawBuffer);

    // Randomized key — unlike the cover image, every gallery image
    // keeps its own filename so multiple can coexist side by side.
    const fileKey = `products/${productId}/gallery/${randomUUID()}.webp`;
    const publicUrl = await uploadToR2(fileKey, processedBuffer, "image/webp");

    const galleryImage = await prisma.productGalleryImage.create({
      data: { productId, url: publicUrl, key: fileKey, sortOrder: existingCount },
    });

    await prisma.product.update({ where: { id: productId }, data: { updatedBy: admin.email } });

    return NextResponse.json({
      success: true,
      data: { id: galleryImage.id, url: galleryImage.url, sortOrder: galleryImage.sortOrder },
      message: "Image added to gallery.",
    });
  } catch (error) {
    console.error("[api/admin/products/media/gallery] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Gallery image upload failed. Please try again." },
      { status: 500 }
    );
  }
}
