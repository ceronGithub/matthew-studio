/**
 * FILE: app/api/buyer/downloads/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Lists every digital product the current buyer owns
 * (buyer_account_specification.md Section 4.1/6). Each BuyerDownload
 * row is joined against its Product row for the thumbnail, name, and
 * category shown on each card. Scoped to WHERE userId = the calling
 * buyer's own id (Section 2) — never trusts a client-submitted id.
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the session cookie.
 * 2. Fetch that buyer's BuyerDownload rows.
 * 3. Fetch the matching Product rows in one query and merge by id —
 *    avoids an N+1 query per download row.
 * 4. Return the merged list in the standard response shape (Rule 28).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const downloads = await prisma.buyerDownload.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
    });

    const productIds = downloads.map((download) => download.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, categoryLabel: true, coverImageUrl: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    const data = downloads.map((download) => {
      const product = productById.get(download.productId);
      return {
        id: download.id,
        productId: download.productId,
        name: product?.name ?? "Unknown product",
        categoryLabel: product?.categoryLabel ?? null,
        coverImageUrl: product?.coverImageUrl ?? null,
        licenseKey: download.licenseKey,
        purchasedAt: download.purchasedAt,
      };
    });

    return NextResponse.json({ success: true, data, message: "Downloads fetched successfully." });
  } catch (error) {
    console.error("[api/buyer/downloads] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your downloads. Please try again." },
      { status: 500 }
    );
  }
}
