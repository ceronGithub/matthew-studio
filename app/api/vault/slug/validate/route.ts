/**
 * FILE: app/api/vault/slug/validate/route.ts
 * PURPOSE:
 * Validates that an AdminSession slug is still active (isActive=true and
 * expiresAt not yet passed) when the vault page loads. Returns the session
 * metadata if valid (role, timeRemaining until expiry), or 401 if expired
 * or not found. Never exposes the slug itself — only its status.
 *
 * Called on vault page load (task-32 UI) to confirm the admin is still
 * within their vault access window before displaying any content.
 *
 * Per Rule 28 (API response shape standard) and Rule 31.3 (Next.js route handlers).
 */

export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { validateSlugActive } from "@/lib/vaultHelpers";

interface ValidateSlugRequest {
  sessionId: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Input validation — sessionId must be provided and be non-empty
    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Missing or invalid sessionId parameter.",
        },
        { status: 400 }
      );
    }

    // Validate slug is active and not expired (includes isActive check + expiresAt check)
    const session = await validateSlugActive(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Session slug has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Calculate time remaining in minutes/hours for client display
    const now = new Date();
    const diffMs = session.expiresAt.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    let timeRemaining = "";

    if (diffMinutes > 60) {
      const hours = Math.floor(diffMinutes / 60);
      timeRemaining = `${hours} ${hours === 1 ? "hour" : "hours"}`;
    } else {
      timeRemaining = `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"}`;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          isActive: true,
          role: session.role,
          expiresAt: session.expiresAt.toISOString(),
          timeRemaining,
        },
        message: "Slug is valid.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[vault/slug/validate] Error:", (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "An error occurred while validating your session.",
      },
      { status: 500 }
    );
  }
}
