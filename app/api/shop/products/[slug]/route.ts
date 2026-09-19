/**
 * FILE: app/api/shop/products/[slug]/route.ts
 * ROLE: Public — no login required. Feeds the storefront product
 * detail view.
 *
 * PURPOSE:
 * task-121 (admin_account_specification.md Section 9.2). Returns one
 * product by slug, but only if it is `published` and not soft-deleted.
 * A product that is pending review, still a draft, deleted, or simply
 * doesn't exist all return the exact same 404 — a visitor can never
 * tell "exists but unpublished" apart from "doesn't exist".
 *
 * DATA FLOW:
 * 1. Read the slug from the URL.
 * 2. Query with the same published + non-deleted filter as the list
 *    route, including the gallery images.
 * 3. No row found (for any reason) -> the single shared 404 response.
 * 4. Otherwise map through toPublicProduct() and return it.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { PUBLIC_PRODUCT_DETAIL_SELECT, toPublicProduct } from "@/lib/publicProduct";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // findFirst (not findUnique) because the filter includes status and
    // deletedAt, which aren't part of the unique slug index.
    const productRow = await prisma.product.findFirst({
      where: { slug, status: "published", deletedAt: null },
      select: PUBLIC_PRODUCT_DETAIL_SELECT,
    });

    // Same response whether the product is missing, pending review, a
    // draft, or deleted — never leaks that an unpublished product exists.
    if (!productRow) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that product. It may have been moved or removed." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toPublicProduct(productRow),
      message: "Product retrieved.",
    });
  } catch (error) {
    console.error("[api/shop/products/[slug] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load this product. Please try again." },
      { status: 500 }
    );
  }
}
