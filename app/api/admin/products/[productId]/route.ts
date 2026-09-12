/**
 * FILE: app/api/admin/products/[productId]/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products" —
 * self-checked via getSessionAdmin() + hasAdminPermission().
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.2.2 — full product detail
 * (GET, Task 20), update (PUT, Task 21), and soft delete (DELETE,
 * Task 21). Media fields (coverImageUrl, galleryImages,
 * previewVideoUrl) are intentionally never written here —
 * product_media_upload_specification.md (build sequence item 9) owns
 * that surface once this CRUD loop exists.
 *
 * DATA FLOW (PUT):
 * 1. CSRF check, then the same auth + permission checks as GET.
 * 2. Load the existing product (404 if missing/deleted) — needed to
 *    diff before/after for the audit log.
 * 3. Validate + clean the body via validateProductInput().
 * 4. Update the row, set updatedBy = admin.email.
 * 5. Write an AuditLog row (action: "updated", changes = only the
 *    fields that actually differ, via diffProductFields()).
 *
 * DATA FLOW (DELETE):
 * 1. CSRF check, then the same auth + permission checks as GET.
 * 2. Soft delete only — sets deletedAt (Rule 6), never a hard
 *    Prisma .delete(). 404 if already deleted/missing.
 * 3. Write an AuditLog row (action: "deleted").
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { CATEGORY_LABELS, validateProductInput, resolveProductStatus } from "@/lib/adminProductValidation";
import { recordAuditLog, diffProductFields } from "@/lib/auditLog";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
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

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that product." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { cleaned, errors } = validateProductInput(body);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, data: null, message: errors[0].message, error: JSON.stringify(errors) },
        { status: 400 }
      );
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        category: cleaned.category,
        categoryLabel: CATEGORY_LABELS[cleaned.category],
        name: cleaned.name,
        description: cleaned.description,
        startingPrice: cleaned.price,
        // Section 9.2 approval flow (task-110): a regular admin's edit
        // reverts to pending-review the same as a create does — an
        // already-published product isn't exempt from re-review once
        // touched. Super-admin edits bypass this as usual.
        status: resolveProductStatus(admin.role, cleaned.status),
        badge: cleaned.featured ? "new" : existing.badge,
        updatedBy: admin.email ?? "unknown",
      },
    });

    const changes = diffProductFields(
      {
        category: existing.category,
        categoryLabel: existing.categoryLabel,
        name: existing.name,
        description: existing.description,
        startingPrice: existing.startingPrice,
        status: existing.status,
        badge: existing.badge,
      },
      {
        category: updated.category,
        categoryLabel: updated.categoryLabel,
        name: updated.name,
        description: updated.description,
        startingPrice: updated.startingPrice,
        status: updated.status,
        badge: updated.badge,
      }
    );

    await recordAuditLog({
      entityType: "product",
      entityId: updated.id,
      actor: admin.email ?? "unknown",
      action: "updated",
      changes,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Product saved successfully.",
    });
  } catch (error) {
    console.error("[api/admin/products/[productId] PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save the product. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
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

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that product." },
        { status: 404 }
      );
    }

    // Rule 6 soft delete — never a hard .delete(), so the record and
    // its AuditLog history stay recoverable.
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      entityType: "product",
      entityId: productId,
      actor: admin.email ?? "unknown",
      action: "deleted",
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("[api/admin/products/[productId] DELETE] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't delete the product. Please try again." },
      { status: 500 }
    );
  }
}
