/**
 * FILE: app/api/auth/forgot-password/route.ts
 * PURPOSE:
 * Requests a Supabase password-reset email for the given address. The
 * response is always the same generic success message regardless of
 * whether the email exists — never reveal which emails are registered
 * (same enumeration-prevention rule as /api/auth/login, Section 3.1
 * of login_and_registration_page.md).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

const FORGOT_PASSWORD_MAX_ATTEMPTS = 3;
const FORGOT_PASSWORD_WINDOW_MINUTES = 15;

// Same generic copy every time — a distinct message for "email not
// found" would let an attacker enumerate registered accounts.
const GENERIC_MESSAGE = "If that email is registered, we've sent a password reset link.";

export async function POST(request: Request) {
  try {
    // Rate limit BEFORE touching Supabase — 3 attempts per 15 minutes,
    // stricter than login since this endpoint sends an email per hit.
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(
      ipAddress,
      "forgot-password",
      FORGOT_PASSWORD_MAX_ATTEMPTS,
      FORGOT_PASSWORD_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email: string = (body.email ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your email address." },
        { status: 400 }
      );
    }

    // Recovery link lands on our own reset-password page. Built from the
    // request's own origin rather than a hardcoded env var, so it works
    // the same in every environment (local, preview, production).
    const redirectTo = `${new URL(request.url).origin}/auth/reset-password`;

    const { error } = await supabaseServerClient.auth.resetPasswordForEmail(email, { redirectTo });

    // Log the real outcome server-side for security visibility, but
    // never let it change what the client sees — the response stays
    // generic either way (enumeration prevention).
    await logSecurityEvent({
      eventType: "password_reset_requested",
      actor: email,
      request,
      details: error ? `Supabase error (not shown to client): ${error.message}` : "Reset email sent",
    });

    return NextResponse.json({ success: true, data: null, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[auth/forgot-password] Unexpected error:", (error as Error).message);
    // Still generic — an unexpected error shouldn't leak anything either.
    return NextResponse.json({ success: true, data: null, message: GENERIC_MESSAGE });
  }
}
