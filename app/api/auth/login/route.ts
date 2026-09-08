/**
 * FILE: app/api/auth/login/route.ts
 * PURPOSE:
 * Authenticates a buyer, admin, or super-admin against Supabase Auth.
 * On success, stores the Supabase access + refresh tokens in HttpOnly
 * cookies (never localStorage) so middleware.ts can validate the
 * session on protected routes. Returns the same generic error for a
 * wrong email or wrong password — never reveals which one failed.
 *
 * For admin/superAdmin roles only, also issues or reuses the Vault
 * session slug (vault_specification.md Section 5.1, task-29) via
 * lib/vaultHelpers.ts's getOrCreateAdminSession — buyers never get an
 * AdminSession row. Cookie-issuance + Vault slug logic now lives in
 * lib/loginSession.ts (task-47-api-totp-login-verify) so
 * app/api/auth/totp/verify-login/route.ts can grant a session the
 * exact same way once a TOTP code is confirmed — never a second copy
 * of this logic.
 *
 * TOTP gate (super_admin_account_specification.md Section 9.1,
 * task-47-api-totp-login-verify, part 3 of 6): once password auth AND
 * the anomaly check both pass, an admin/superAdmin account that
 * already has TOTP enabled is NOT granted a session here. Instead a
 * short-lived pending token is issued (lib/pendingTotpLogin.ts) and
 * the response tells the client to submit the 6-digit code to
 * POST /api/auth/totp/verify-login next — no cookies, no Vault slug,
 * no `/superAdmin/*`/`/admin/*` access until that succeeds. An account
 * that has never enrolled TOTP is unaffected by this branch — forcing
 * enrollment itself is task-47-totp-setup-gate's job, a separate
 * middleware redirect that runs once they DO have a session.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { supabaseServerClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { createLoginSuccessResponse } from "@/lib/loginSession";
import { createPendingTotpLoginToken } from "@/lib/pendingTotpLogin";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  try {
    // CSRF check first (Rule 32.2) — reject forged cross-origin requests
    // before they can consume the legitimate rate-limit budget below.
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    // Rate limit BEFORE touching Supabase — blocks brute-force attempts
    // as cheaply as possible, before any auth call is even made.
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "login", LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your email and password." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServerClient.auth.signInWithPassword({ email, password });

    // Generic message either way — prevents email enumeration.
    if (error || !data.session || !data.user) {
      // Awaited (not fire-and-forget) — serverless functions can be
      // frozen/terminated right after the response is sent, which would
      // drop an un-awaited write. logSecurityEvent itself never throws.
      await logSecurityEvent({
        eventType: "login_failed",
        actor: email,
        request,
        details: error?.message ?? "No session returned",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Invalid email or password.", error: "Authentication failed" },
        { status: 401 }
      );
    }

    const role = (data.user.user_metadata?.role as string) ?? "buyer";

    await logSecurityEvent({
      eventType: "login_success",
      actor: data.user.email ?? email,
      request,
      details: `Signed in as role: ${role}`,
    });

    // Section 9.1 — an impossible-travel login BLOCKS the session
    // instead of just logging it. This check runs BEFORE Vault slug
    // issuance below, so a blocked login never creates an AdminSession
    // row — blocking the response itself (no cookies set, no success)
    // is the enforcement point. A device_change alone is only logged,
    // never blocks — see lib/anomalyDetection.ts's header comment.
    const anomalyCheck = await detectAnomalies({ accountId: data.user.email ?? email, request });
    if (anomalyCheck.blocked) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "This login was blocked due to unusual activity. Please try again or contact support.",
        },
        { status: 403 }
      );
    }

    // TOTP gate — only admin/superAdmin roles can ever have a row
    // here; buyers are never queried (mirrors lib/loginSession.ts's
    // own role check inside buildLoginResponseData).
    const totpCredential =
      role === "admin" || role === "superAdmin"
        ? await prisma.adminTotpCredential.findFirst({ where: { userId: data.user.id, enabled: true } })
        : null;

    if (totpCredential) {
      const pendingToken = createPendingTotpLoginToken({
        userId: data.user.id,
        email: data.user.email ?? null,
        role: role as "admin" | "superAdmin",
        sessionAccessToken: data.session.access_token,
        sessionRefreshToken: data.session.refresh_token,
        sessionExpiresIn: data.session.expires_in,
      });

      await logSecurityEvent({
        eventType: "totp_login_pending",
        actor: data.user.email ?? email,
        request,
        details: `Password verified for ${role} account; awaiting TOTP code.`,
      });

      // No cookies, no Vault slug — a real session is only granted
      // once POST /api/auth/totp/verify-login confirms the code.
      return NextResponse.json({
        success: true,
        data: { totpRequired: true, pendingToken },
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }

    return await createLoginSuccessResponse(
      { userId: data.user.id, email: data.user.email ?? null, role },
      data.session,
      request,
      "Signed in successfully."
    );
  } catch (error) {
    console.error("[auth/login] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
