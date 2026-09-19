/**
 * FILE: app/api/superadmin/media/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/announcements/route.ts.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 9.3 — lists what is
 * already uploaded to the Cloudflare R2 bucket so the
 * /superAdmin/media page (task-120) can reuse an existing image
 * instead of re-uploading it. No DB table — R2 itself is the source.
 *
 * DATA FLOW (GET):
 * 1. Auth check (superAdmin only).
 * 2. Read folder / cursor / limit from the query string. folder must
 *    be one of MEDIA_LIBRARY_FOLDERS (or omitted for all of them).
 * 3. Ask R2 for one page of objects via listR2Objects().
 * 4. Return the page plus nextCursor (null on the last page).
 *
 * PRIVATE FILES: the bucket also holds files that must never appear
 * here — database backups and paid buyer downloads. Only the folders
 * in MEDIA_LIBRARY_FOLDERS are ever returned, so a new private folder
 * stays hidden by default until someone adds it to that list.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { listR2Objects, type R2ObjectSummary } from "@/services/r2";

// Only these top-level R2 folders are public website assets.
const MEDIA_LIBRARY_FOLDERS = ["products", "banners", "avatars", "orders"];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_CURSOR_LENGTH = 2048;

// When no folder is chosen, private keys are skipped after each fetch,
// so a page can come back short. A few extra rounds refill it.
const MAX_LIST_ROUNDS = 5;

/**
 * isMediaLibraryKey
 * True when an R2 key sits inside one of the public media folders.
 */
function isMediaLibraryKey(key: string): boolean {
  return MEDIA_LIBRARY_FOLDERS.some((folderName) => key.startsWith(`${folderName}/`));
}

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin || admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    const folder = searchParams.get("folder")?.trim() || null;
    if (folder && !MEDIA_LIBRARY_FOLDERS.includes(folder)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Unknown folder. Choose one of: ${MEDIA_LIBRARY_FOLDERS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const requestedCursor = searchParams.get("cursor")?.trim() || undefined;
    if (requestedCursor && requestedCursor.length > MAX_CURSOR_LENGTH) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid page cursor. Please reload the list." },
        { status: 400 }
      );
    }

    const folderPrefix = folder ? `${folder}/` : undefined;

    let currentCursor = requestedCursor;
    let nextCursor: string | null = null;
    const mediaObjects: R2ObjectSummary[] = [];

    for (let round = 0; round < MAX_LIST_ROUNDS; round++) {
      // Ask only for what is still missing so the page never overshoots limit
      const listedPage = await listR2Objects({
        prefix: folderPrefix,
        cursor: currentCursor,
        limit: limit - mediaObjects.length,
      });

      for (const listedObject of listedPage.objects) {
        if (isMediaLibraryKey(listedObject.key)) mediaObjects.push(listedObject);
      }

      nextCursor = listedPage.nextCursor;
      if (!nextCursor || mediaObjects.length >= limit) break;
      currentCursor = nextCursor;
    }

    return NextResponse.json({
      success: true,
      data: {
        objects: mediaObjects,
        nextCursor,
        folder,
        folders: MEDIA_LIBRARY_FOLDERS,
      },
      message: "Media retrieved.",
    });
  } catch (error) {
    // Logged for debugging R2 credential/bucket misconfiguration — the user only sees the generic message
    console.error("[api/superadmin/media GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load the media library. Please try again." },
      { status: 500 }
    );
  }
}
