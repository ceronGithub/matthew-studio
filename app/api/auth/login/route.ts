/**
 * FILE: app/api/auth/login/route.ts
 * PURPOSE:
 * Authenticates a buyer, admin, or super-admin against Supabase Auth.
 * On success, stores the Supabase access + refresh tokens in HttpOnly
 * cookies (never localStorage) so middleware.ts can validate the
 * session on protected routes. Returns the same generic error for a
 * wrong email or wrong password — never reveals which one failed.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { detectAnomalies } from "@/lib/anomalyDetection";

const isProduction = process.env.NODE_ENV === "production";
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
    // instead of just logging it. No AdminSession row is created by
    // this route yet, so there's nothing to deactivate — blocking the
    // response itself (no cookies set, no success) is the enforcement
    // point for now. A device_change alone is only logged, never
    // blocks — see lib/anomalyDetection.ts's header comment.
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

    const response = NextResponse.json({
      success: true,
      data: { userId: data.user.id, email: data.user.email, role },
      message: "Signed in successfully.",
    });

    // HttpOnly session cookies — read by middleware.ts on every protected request.
    response.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: data.session.expires_in,
    });
    response.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("[auth/login] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
