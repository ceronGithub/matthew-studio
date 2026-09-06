/**
 * FILE: app/api/auth/logout/route.ts
 * PURPOSE:
 * Signs the current user out. Expires the HttpOnly session cookies set
 * by /api/auth/login and /api/auth/register so middleware.ts treats
 * the next request as unauthenticated. Also asks the browser to clear
 * any cookies/storage/cache tied to this origin (Origin-Scoped Session
 * Termination) — belt-and-suspenders on top of the cookie expiry,
 * which is the part that actually ends the session.
 *
 * For admin/superAdmin roles, also expires every active AdminSession
 * row for this user (vault_specification.md Section 5.2/2.1, task-29)
 * so the Vault slug is invalidated and the next login always generates
 * a brand-new one — old slugs are never reused after sign-out.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isValidCsrfRequest } from "@/lib/csrf";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { expireAdminSessions } from "@/lib/vaultHelpers";
import { logSecurityEvent } from "@/lib/securityLog";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    // CSRF check (Rule 32.2) — logout is low-stakes if forged (it just
    // signs the victim out), but every state-changing endpoint gets the
    // same protection for consistency.
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request." },
        { status: 403 }
      );
    }

    // Resolve BEFORE clearing cookies below — getSessionAdmin reads the
    // sb-access-token cookie this same request still carries. Returns
    // null for buyers (no AdminSession applies) or an already-expired
    // token, in which case there's simply nothing to expire.
    const admin = await getSessionAdmin(request);
    if (admin) {
      await expireAdminSessions(admin.id);
      await logSecurityEvent({
        eventType: "vault_slug_expired",
        actor: admin.email,
        request,
        details: `All active AdminSession rows expired for role ${admin.role} on sign-out`,
      });
    }

    const response = NextResponse.json({
      success: true,
      data: null,
      message: "Signed out successfully.",
    });

    // Expire both session cookies — the authoritative logout step.
    response.cookies.set("sb-access-token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("sb-refresh-token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    // Requires a secure (HTTPS) context in most browsers — skip on local
    // HTTP dev where it would be silently ignored anyway.
    if (isProduction) {
      response.headers.set("Clear-Site-Data", '"cookies", "storage", "cache"');
    }

    return response;
  } catch (error) {
    console.error("[auth/logout] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Sign out failed. Please try again." },
      { status: 500 }
    );
  }
}
