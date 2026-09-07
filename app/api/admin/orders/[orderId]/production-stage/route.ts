/**
 * FILE: app/api/admin/orders/[orderId]/production-stage/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher. Also gated on
 * the "manage-orders" permission (hasAdminPermission) per this
 * endpoint's explicit "Permission: manage-orders" line in the spec —
 * unlike its task-77/78 siblings, which don't state a permission.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.3.3 — T-Shirt Production
 * Tracking. Moves `Order.productionStage` through the 6-stage
 * pipeline (design_review → design_approved → printing →
 * quality_check → packed → shipped), records each transition in
 * `productionStageHistory`, and optionally attaches a proof photo at
 * the quality_check or packed stage.
 *
 * DATA FLOW:
 * 1. CSRF + session + "manage-orders" permission checks.
 * 2. Load the order + items, join Product for category (same pattern
 *    as task-76's GET route) — 400 if the order has no `tshirts`-
 *    category item, since this pipeline never applies to digital-only
 *    orders (spec: "Applies only to: orders containing a tshirts-
 *    category item").
 * 3. Validate the target `productionStage` is one of the 6 known
 *    stages.
 * 4. Direction (advance vs revert) is computed server-side by
 *    comparing pipeline indices — never trusted from the client's
 *    `isRevert` flag alone (Rule 6: authorization/validation must not
 *    rely on a client-supplied value) — so a required-note revert
 *    can't be smuggled through as `isRevert: false`. `note` is
 *    required whenever the computed direction is backward.
 * 5. Optional proof photo (multipart field `photo`) — only accepted
 *    when the TARGET stage is quality_check or packed, per spec;
 *    resized/compressed via processImage() and uploaded to R2 at a
 *    per-transition key (never overwritten, so earlier proof photos
 *    stay accessible in history).
 * 6. Append the transition to `productionStageHistory` (shape consumed
 *    by app/api/buyer/orders/[orderId]/route.ts's
 *    ProductionStageHistoryEntry: productionStage, note, isRevert,
 *    changedAt — adminId/photoUrl added as extra fields the buyer
 *    route already ignores unknown keys on).
 * 7. Setting stage "shipped" also flips the top-level `status` to
 *    "Shipped" (matching task-77's capitalized VALID_STATUSES, not
 *    the spec's lowercase JSON example — this app's actual status
 *    values are the capitalized set already in use), appends a
 *    statusHistory entry, and notifies the buyer — same shape as
 *    task-77's handleUpdateStatus, since this is the same kind of
 *    buyer-facing status change, just triggered from a different UI
 *    action.
 * 8. Logs SecurityLog `order_production_stage_updated` (old stage,
 *    new stage, order ID, admin) — mirrors task-77's admin_action
 *    logging pattern but with its own dedicated event type, per this
 *    task's spec line.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";
import { createNotification } from "@/lib/notifications";
import { processImage } from "@/lib/imageProcessor";
import { uploadToR2 } from "@/services/r2";
import { PRODUCTION_STAGE_LABELS } from "@/lib/orderStatus";

// Canonical pipeline order — object key insertion order is guaranteed
// for string keys, and this map is already the single source of
// truth for stage labels (lib/orderStatus.ts), so we derive the
// sequence from it rather than maintaining a second array.
const STAGE_ORDER = Object.keys(PRODUCTION_STAGE_LABELS);
const PHOTO_ALLOWED_STAGES = ["quality_check", "packed"];
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

interface ProductionStageHistoryEntry {
  productionStage: string;
  note: string | null;
  isRevert: boolean;
  changedAt: string;
  adminId: string;
  photoUrl: string | null;
}

interface StatusHistoryEntry {
  status: string;
  adminId: string;
  note: string | null;
  createdAt: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
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

    const allowed = await hasAdminPermission(admin, "manage-orders");
    if (!allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to manage orders." },
        { status: 403 }
      );
    }

    const { orderId } = await params;

    const formData = await request.formData();
    const targetStage = formData.get("productionStage") as string | null;
    const note = (formData.get("note") as string | null)?.trim() || "";
    const photo = formData.get("photo") as File | null;

    if (!targetStage || !STAGE_ORDER.includes(targetStage)) {
      return NextResponse.json(
        { success: false, data: null, message: "Please choose a valid production stage." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
        { status: 404 }
      );
    }

    // This pipeline only ever applies to orders carrying a
    // tshirts-category item (spec: "Applies only to...") — same
    // category join as task-76's GET route, since OrderItem itself
    // only snapshots name/price/variant, never category.
    const productIds = Array.from(new Set(order.items.map((item) => item.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    const hasTshirtItem = order.items.some((item) => productById.get(item.productId)?.category === "tshirts");

    if (!hasTshirtItem) {
      return NextResponse.json(
        { success: false, data: null, message: "This order doesn't contain any t-shirt items to track production for." },
        { status: 400 }
      );
    }

    const currentIndex = order.productionStage ? STAGE_ORDER.indexOf(order.productionStage) : -1;
    const targetIndex = STAGE_ORDER.indexOf(targetStage);
    const isRevert = targetIndex < currentIndex;

    if (isRevert && !note) {
      return NextResponse.json(
        { success: false, data: null, message: "Please explain why you're reverting this stage before saving." },
        { status: 400 }
      );
    }

    // Proof photo is only meaningful at quality_check/packed per
    // spec — reject rather than silently drop it elsewhere, so the
    // admin knows why it wasn't attached.
    if (photo && !PHOTO_ALLOWED_STAGES.includes(targetStage)) {
      return NextResponse.json(
        { success: false, data: null, message: "Proof photos can only be attached at the Quality Check or Packed stage." },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;
    if (photo) {
      if (!ACCEPTED_PHOTO_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { success: false, data: null, message: "Only JPEG, PNG, WebP, and GIF files are accepted." },
          { status: 400 }
        );
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { success: false, data: null, message: "Proof photo is too large. Maximum size is 5MB." },
          { status: 400 }
        );
      }
      const rawBuffer = Buffer.from(await photo.arrayBuffer());
      const processedBuffer = await processImage(rawBuffer);
      // Timestamped key — never overwritten, so earlier proof photos
      // from prior transitions remain viewable in history.
      const fileKey = `orders/${orderId}/production/${targetStage}-${Date.now()}.webp`;
      photoUrl = await uploadToR2(fileKey, processedBuffer, "image/webp");
    }

    const changedAt = new Date().toISOString();
    const existingStageHistory = (order.productionStageHistory as ProductionStageHistoryEntry[] | null) ?? [];
    const stageEntry: ProductionStageHistoryEntry = {
      productionStage: targetStage,
      note: note || null,
      isRevert,
      changedAt,
      adminId: admin.id,
      photoUrl,
    };

    const updateData: {
      productionStage: string;
      productionStageHistory: ProductionStageHistoryEntry[];
      status?: string;
      statusHistory?: StatusHistoryEntry[];
    } = {
      productionStage: targetStage,
      productionStageHistory: [...existingStageHistory, stageEntry],
    };

    // "shipped" is a pipeline stage AND the top-level status — keep
    // both in sync in the same write, same as the spec's note.
    if (targetStage === "shipped") {
      const existingStatusHistory = (order.statusHistory as StatusHistoryEntry[] | null) ?? [];
      const statusEntry: StatusHistoryEntry = {
        status: "Shipped",
        adminId: admin.id,
        note: note || null,
        createdAt: changedAt,
      };
      updateData.status = "Shipped";
      updateData.statusHistory = [...existingStatusHistory, statusEntry];
    }

    await prisma.order.update({ where: { id: orderId }, data: updateData });

    if (targetStage === "shipped" && order.userId) {
      await createNotification({
        userId: order.userId,
        type: "order_update",
        title: "Order status updated: Shipped",
        body: `Your order #${order.id.slice(-8)} is now marked as "Shipped".`,
        linkHref: `/buyer/orders/${order.id}`,
      });
    }

    await logSecurityEvent({
      eventType: "order_production_stage_updated",
      actor: admin.email,
      request,
      details: `Order ${orderId}: ${order.productionStage ?? "(none)"} → ${targetStage}${isRevert ? " (revert)" : ""}`,
    });

    return NextResponse.json({
      success: true,
      data: { orderId, productionStage: targetStage, photoUrl },
      message: "Production stage updated.",
    });
  } catch (error) {
    console.error("[api/admin/orders/[orderId]/production-stage PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update the production stage. Please try again." },
      { status: 500 }
    );
  }
}
