/**
 * FILE: app/api/admin/products/route.ts
 * ROLE: Admin/super-admin only, gated on "manage-products" —
 * self-checked via getSessionAdmin() + hasAdminPermission().
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.2.2 — paginated product
 * list (GET, Task 20/22) and product create (POST, Task 21). This
 * file previously held a byte-for-byte copy of
 * app/api/admin/products/[productId]/route.ts, so GET/POST here were
 * never wired — task-112's re-verification (2026-09-13) caught this
 * and it's rebuilt from scratch below. PUT/DELETE stay on the
 * [productId] route; nothing there changes.
 *
 * DATA FLOW (GET):
 * 1. Auth + "manage-products" permission check.
 * 2. Read page/category/status/search from the query string —
 *    matches lib/hooks/useAdminProducts.ts's exact param names.
 * 3. Query non-deleted products (Rule 6 soft-delete exclusion),
 *    paginated + filtered, newest-updated first.
 *
 * DATA FLOW (POST):
 * 1. CSRF check, then the same auth + permission checks as GET.
 * 2. Validate + clean the body via validateProductInput().
 * 3. Resolve status via resolveProductStatus() — Section 9.2's
 *    approval flow: a regular admin's "published" request lands as
 *    "pending-review"; a super-admin's request is used as-is.
 * 4. Generate a unique slug from the name (slugify() + a short
 *    random suffix on collision, never a DB-polling loop).
 * 5. Create the row, set createdBy = admin.email.
 * 6. Write an AuditLog row (action: "created").
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { hasAdminPermission } from "@/lib/hasAdminPermission";
import { isValidCsrfRequest } from "@/lib/csrf";
import {
  CATEGORY_LABELS,
  CATEGORY_ICON_NAMES,
  VALID_CATEGORIES,
  VALID_STATUSES,
  validateProductInput,
  resolveProductStatus,
  slugify,
} from "@/lib/adminProductValidation";
import { recordAuditLog } from "@/lib/auditLog";

const PAGE_SIZE = 25;

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

    // Mirrors lib/hooks/useAdminProducts.ts: "all" (or an unrecognized
    // value) means no filter on that field — only a valid, specific
    // value narrows the query.
    const rawCategory = searchParams.get("category");
    const category = rawCategory && VALID_CATEGORIES.includes(rawCategory) ? rawCategory : undefined;

    const rawStatus = searchParams.get("status");
    const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;

    const search = searchParams.get("search")?.trim();

    const where = {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
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
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        totalCount,
        page,
      },
      message: "Products retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/products GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load products. Please try again." },
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

    const body = await request.json();
    const { cleaned, errors } = validateProductInput(body);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, data: null, message: errors[0].message, error: JSON.stringify(errors) },
        { status: 400 }
      );
    }

    // Unique slug from the product name. A collision gets a short
    // random suffix rather than looping re-queries against the DB —
    // validateProductInput/slugify stay pure functions (see
    // lib/adminProductValidation.ts's own note on this).
    const baseSlug = slugify(cleaned.name);
    const existingSlug = await prisma.product.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}` : baseSlug;

    const created = await prisma.product.create({
      data: {
        slug,
        category: cleaned.category,
        categoryLabel: CATEGORY_LABELS[cleaned.category],
        iconName: CATEGORY_ICON_NAMES[cleaned.category],
        name: cleaned.name,
        description: cleaned.description,
        startingPrice: cleaned.price,
        // Section 9.2 approval flow (task-110): a regular admin's
        // create lands as pending-review the same as an edit does.
        // Super-admin creates bypass this and use their requested
        // status as-is.
        status: resolveProductStatus(admin.role, cleaned.status),
        badge: cleaned.featured ? "new" : null,
        createdBy: admin.email ?? "unknown",
      },
    });

    await recordAuditLog({
      entityType: "product",
      entityId: created.id,
      actor: admin.email ?? "unknown",
      action: "created",
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "Product created successfully.",
    });
  } catch (error) {
    console.error("[api/admin/products POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't create the product. Please try again." },
      { status: 500 }
    );
  }
}
