/**
 * FILE: lib/loginSession.ts
 * PURPOSE:
 * Shared "finish the login" logic used by both app/api/auth/login/route.ts
 * (accounts without TOTP enabled) and app/api/auth/totp/verify-login/route.ts
 * (task-47-api-totp-login-verify, once the 6-digit code is confirmed).
 * Extracted here so cookie-issuance + Vault slug logic exists in exactly
 * one place — task-47-api-totp-login-verify's spec explicitly calls for
 * this rather than duplicating the cookie-setting code that used to live
 * inline in login/route.ts.
 *
 * Nothing here is TOTP-specific: this is the same "grant a real session"
 * step a login has always performed, just reachable from two call sites
 * now instead of one.
 */
import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { getOrCreateAdminSession } from "@/lib/vaultHelpers";
import { UAParser } from "ua-parser-js";

const isProduction = process.env.NODE_ENV === "production";

export interface AuthenticatedLoginUser {
  userId: string;
  email: string | null;
  role: string;
}

export interface SupabaseLoginSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * buildLoginResponseData
 * Base response is just { userId, email, role } for buyers. For
 * admin/superAdmin roles, also issues (or reuses) the Vault session
 * slug (vault_specification.md Section 5.1) and logs which happened
 * (Section 8.3: vault_slug_generated vs. vault_slug_reused). Never
 * throws — a slug issuance failure logs and falls back to the base
 * shape rather than blocking a successful login.
 *
 * Called ONLY at the point a real session is about to be granted — for
 * a TOTP-enabled account that means AFTER the code is verified, never
 * at the pending-token stage (task-47-api-totp-login-verify).
 */
export async function buildLoginResponseData(user: AuthenticatedLoginUser, request: Request) {
  const baseData = { userId: user.userId, email: user.email, role: user.role };

  if (user.role !== "admin" && user.role !== "superAdmin") {
    return baseData;
  }

  try {
    const userAgent = request.headers.get("user-agent");
    const parsed = userAgent ? new UAParser(userAgent).getResult() : null;

    const { session, reused } = await getOrCreateAdminSession(user.userId, user.role, {
      ipAddress: getClientIp(request),
      userAgent,
      deviceType: parsed?.device.type ?? "desktop",
    });

    await logSecurityEvent({
      eventType: reused ? "vault_slug_reused" : "vault_slug_generated",
      actor: user.email,
      request,
      details: `AdminSession ${session.id} ${reused ? "reused" : "generated"} for role ${user.role}`,
    });

    return {
      ...baseData,
      adminSessionId: session.id,
      slug: session.slug,
    };
  } catch (error) {
    // A slug failure should never block an otherwise-successful login —
    // the account just won't have vault access until the next attempt.
    console.error("[loginSession] Vault slug issuance failed:", (error as Error).message);
    return baseData;
  }
}

/**
 * setSessionCookies
 * Stores the Supabase access + refresh tokens in HttpOnly cookies —
 * read by middleware.ts on every protected request. The ONLY place
 * either login route may do this.
 */
export function setSessionCookies(response: NextResponse, session: SupabaseLoginSession): void {
  response.cookies.set("sb-access-token", session.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: session.expires_in,
  });
  response.cookies.set("sb-refresh-token", session.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * createLoginSuccessResponse
 * Builds the final { success: true, data, message } response AND
 * attaches the session cookies in one step — the single implementation
 * both the direct-login path (app/api/auth/login/route.ts, no TOTP) and
 * the post-verify path (app/api/auth/totp/verify-login/route.ts) call,
 * per task-47-api-totp-login-verify's "never duplicate the
 * cookie-setting logic" requirement.
 */
export async function createLoginSuccessResponse(
  user: AuthenticatedLoginUser,
  session: SupabaseLoginSession,
  request: Request,
  message: string
): Promise<NextResponse> {
  const response = NextResponse.json({
    success: true,
    data: await buildLoginResponseData(user, request),
    message,
  });
  setSessionCookies(response, session);
  return response;
}
