/**
 * FILE: app/api/buyer/profile/avatar/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * Handles the avatar upload from /buyer/profile
 * (buyer_account_specification.md Section 4.2). Validates type/size,
 * resizes+compresses+converts to WebP (Rule 35.6 — never uploads a
 * raw file to R2), uploads to Cloudflare R2 under avatars/, deletes
 * the buyer's previous avatar object if one existed, then updates
 * user_metadata.avatarUrl/avatarR2Key so future GETs reflect it.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getSessionUser } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";
import { processImage } from "@/lib/imageProcessor";
import { uploadToR2, deleteFromR2 } from "@/services/r2";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
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
    // Avatars only ever render small — 400px keeps quality while
    // avoiding the 1200px default's unnecessarily large file size.
    const processedBuffer = await processImage(rawBuffer, { maxWidth: 400, maxHeight: 400 });

    const fileKey = `avatars/${user.id}/${randomUUID()}.webp`;
    const publicUrl = await uploadToR2(fileKey, processedBuffer, "image/webp");

    // Clean up the previous avatar object — never leave orphaned files
    // in the bucket when a buyer replaces their photo.
    const previousKey = user.user_metadata?.avatarR2Key as string | undefined;
    if (previousKey) {
      await deleteFromR2(previousKey).catch((error) =>
        console.error("[api/buyer/profile/avatar] Failed to delete previous avatar:", error)
      );
    }

    const { error } = await supabaseAdminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, avatarUrl: publicUrl, avatarR2Key: fileKey },
    });

    if (error) {
      return NextResponse.json(
        { success: false, data: null, message: "Avatar uploaded but couldn't be saved. Please try again.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { avatarUrl: publicUrl },
      message: "Profile photo updated.",
    });
  } catch (error) {
    console.error("[api/buyer/profile/avatar] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Avatar upload failed. Please try again." },
      { status: 500 }
    );
  }
}
