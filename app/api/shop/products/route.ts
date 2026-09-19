/**
 * FILE: app/api/shop/products/route.ts
 * ROLE: Public — no login required. Feeds the storefront product grid.
 *
 * PURPOSE:
 * task-121 (admin_account_specification.md Section 9.2, approval flow).
 * Returns only products that are `published` and not soft-deleted, so
 * draft and pending-review products can never reach a visitor. Closes
 * the docs/openFindings.md [2026-09-13] gap: the storefront never
 * queried the Product table at all.
 *
 * DATA FLOW:
 * 1. Read page / category / search / sort from the query string. The
 *    param names and sort values match components/products/ProductsGrid.tsx
 *    so task-122 can swap the static array for this call directly.
 * 2. Query published + non-deleted products only, filtered, sorted, and
 *    paginated (24 per page).
 * 3. Map each row through toPublicProduct() — admin emails and storage
 *    keys are never selected.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { VALID_CATEGORIES, FORBIDDEN_CHARACTERS } from "@/lib/adminProductValidation";
import { PUBLIC_PRODUCT_SELECT, toPublicProduct } from "@/lib/publicProduct";

const PAGE_SIZE = 24;
const MAX_SEARCH_LENGTH = 100;

// Sort values match SortMode in components/products/ProductsGrid.tsx.
// An unknown value falls back to "bestselling", same as that component.
const SORT_ORDER_BY = {
  bestselling: { trendingScore: "desc" },
  newest: { dateAdded: "desc" },
  "price-asc": { startingPrice: "asc" },
  "price-desc": { startingPrice: "desc" },
  rating: { ratingAverage: "desc" },
} as const;

type SortMode = keyof typeof SORT_ORDER_BY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    // "all" (or an unrecognized value) means no category filter.
    const rawCategory = searchParams.get("category");
    const category = rawCategory && VALID_CATEGORIES.includes(rawCategory) ? rawCategory : undefined;

    // Strip the forbidden characters (Rule 18.1) and cap the length before
    // the term ever reaches the query.
    const search = (searchParams.get("search") ?? "")
      .replace(FORBIDDEN_CHARACTERS, "")
      .trim()
      .slice(0, MAX_SEARCH_LENGTH);

    const rawSort = searchParams.get("sort") ?? "";
    const sortMode: SortMode = rawSort in SORT_ORDER_BY ? (rawSort as SortMode) : "bestselling";

    // Only published, non-deleted products are ever public. Draft and
    // pending-review rows are excluded here, in the query itself.
    const where = {
      status: "published",
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [productRows, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: SORT_ORDER_BY[sortMode],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: PUBLIC_PRODUCT_SELECT,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products: productRows.map(toPublicProduct),
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        totalCount,
        page,
      },
      message: "Products retrieved.",
    });
  } catch (error) {
    console.error("[api/shop/products GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load products. Please try again." },
      { status: 500 }
    );
  }
}
