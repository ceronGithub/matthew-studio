/**
 * FILE: app/api/admin/products/[productId]/media/cover/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products" — same 3
 * checks as every Task 21 route (CSRF, session, permission).
 *
 * PURPOSE:
 * Task 24 — cover image upload for a product
 * (product_media_upload_specification.md Sections 2.1, 3, 5, 7).
 * Dedicated per-feature route, not a generic /api/upload — this
 * codebase has no such shared endpoint anywhere; the only prior
 * precedent (app/api/buyer/profile/avatar/route.ts) is also a
 * dedicated route, and this follows that same convention rather than
 * the spec's literal Section 5 wording.
 *
 * DATA FLOW:
 * 1. CSRF check, then getSessionAdmin() + hasAdminPermission(admin,
 *    "manage-products") — 403/401 same as Task 21's product routes.
 * 2. Load the product (404 if missing/soft-deleted) — needed to read
 *    any existing coverImageKey before overwriting.
 * 3. Validate file type/size (same ACCEPTED_TYPES/MAX_FILE_SIZE as
 *    the avatar route).
 * 4. processImage() at the 1200px/80% default (products render
 *    larger than avatars — no need to override).
 * 5. Upload to the FIXED key products/<productId>/cover.webp (Section
 *    3 — always this exact filename, so replacing is a plain
 *    overwrite, never a new random key per upload).
 * 6. If Product.coverImageKey already points somewhere else (only
 *    possible from a manual DB edit, since the key is fixed), delete
 *    that old R2 object first so nothing orphans.
 * 7. Update Product.coverImageUrl/coverImageKey, set updatedBy.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { processImage } from "@/lib/imageProcessor";
import { uploadToR2, deleteFromR2 } from "@/services/r2";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

    // Fixed key per Section 3 — always this exact filename, so a
    // re-upload is a plain overwrite rather than accumulating orphans.
    const fileKey = `products/${productId}/cover.webp`;
    const publicUrl = await uploadToR2(fileKey, processedBuffer, "image/webp");

    // Only relevant if a manual DB edit ever pointed coverImageKey
    // somewhere other than the fixed key above — clean it up so it
    // doesn't orphan in the bucket.
    if (product.coverImageKey && product.coverImageKey !== fileKey) {
      await deleteFromR2(product.coverImageKey).catch((error) =>
        console.error("[api/admin/products/media/cover] Failed to delete stale cover object:", error)
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: { coverImageUrl: publicUrl, coverImageKey: fileKey, updatedBy: admin.email },
    });

    return NextResponse.json({
      success: true,
      data: { coverImageUrl: publicUrl },
      message: "Cover image uploaded.",
    });
  } catch (error) {
    console.error("[api/admin/products/media/cover] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Cover image upload failed. Please try again." },
      { status: 500 }
    );
  }
}