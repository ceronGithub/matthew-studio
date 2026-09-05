/**
 * FILE: app/api/buyer/downloads/[id]/file/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Mints a short-lived signed Cloudflare R2 URL for one owned digital
 * item (buyer_account_specification.md Section 4.1/6). The [id] param
 * is a BuyerDownload row id, not a product id — the ownership check
 * below confirms that row's userId matches the calling buyer before
 * ever touching R2, so a buyer can never reach another buyer's file
 * by guessing an id in the URL (Section 2).
 *
 * Never rate-limited (Section 4.1) — this is an authenticated,
 * already-paid action, unlimited re-downloads for owned items.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { getSignedDownloadUrl } from "@/services/r2";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Ownership check: the row must belong to the calling buyer — never
    // just "does this id exist" (Section 2's cross-buyer access rule).
    const download = await prisma.buyerDownload.findFirst({ where: { id, userId } });

    if (!download) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that download." },
        { status: 404 }
      );
    }

    if (!download.r2Key) {
      return NextResponse.json(
        { success: false, data: null, message: "This item has no file to download." },
        { status: 400 }
      );
    }

    const url = await getSignedDownloadUrl(download.r2Key);

    return NextResponse.json({ success: true, data: { url }, message: "Download ready." });
  } catch (error) {
    console.error("[api/buyer/downloads/[id]/file] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Download failed. Please try again." },
      { status: 500 }
    );
  }
}
