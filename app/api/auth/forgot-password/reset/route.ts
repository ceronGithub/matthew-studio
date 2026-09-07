/**
 * FILE: app/api/auth/forgot-password/reset/route.ts
 * ROLE: Public (no session required — authenticated by resetToken only)
 *
 * PURPOSE:
 * Final step (Section 4.6) of buyer_password_recovery_specification.md's
 * FORGOT PASSWORD FLOW — task-68, the last slice of the task-36 split
 * (task-66 schema, task-67 initiate/verify, this file reset).
 * Takes the raw resetToken issued by /verify plus a new password,
 * updates the buyer's Supabase Auth password, consumes the token
 * (single-use), and terminates any lingering session per Rule 44.
 *
 * DATA FLOW:
 * 1. CSRF check (Rule 32.2) — same as every state-changing endpoint.
 * 2. Validate password strength server-side (Rule 6 — never trust the
 *    client-side check alone), same rule set register/route.ts uses.
 * 3. Hash the submitted resetToken and look it up directly on
 *    BuyerRecovery (forgotPasswordResetTokenHash is @unique) — this is
 *    the ONLY thing that identifies which buyer is resetting; there is
 *    no email in the request body, so there is nothing to anti-enumerate
 *    here (Rule 32.4's dummy-hash trick doesn't apply — a wrong/expired
 *    token is simply rejected, the same way an expired login session
 *    would be).
 * 4. Reject if the token is missing, doesn't match any row, or has
 *    expired (10-minute window, Section 6) — same generic message for
 *    all three cases so the failure shape reveals nothing extra.
 * 5. On success: update the password via supabaseAdminClient.auth.
 *    admin.updateUserById() (server-side, no old-password confirmation
 *    needed — that's the point of a verified reset flow), clear the
 *    consumed resetToken fields, log password_recovery_succeeded plus
 *    the existing password_reset_completed eventType (reused from the
 *    legacy Supabase-native reset-password/route.ts so both flows show
 *    up under the same SecurityLog eventType for a super-admin
 *    reviewing the logs), then apply Rule 44 Origin-Scoped Session
 *    Termination to THIS response.
 *
 * SUPABASE SESSION-REVOCATION NOTE (flagged for developer awareness,
 * not a blocker): Supabase's GoTrue automatically revokes all existing
 * refresh tokens for a user the moment their password is changed via
 * updateUserById() — this is server-side, effective immediately, and
 * covers every device/browser the buyer is signed into, not just this
 * one. The Clear-Site-Data + cookie-expiry step below is Rule 44's
 * required belt-and-suspenders on THIS response/browser only (the
 * buyer calling /reset is usually not the same browser session that
 * needs clearing — often they're on a fresh tab with no session
 * cookie at all — but the pattern is applied unconditionally per Rule
 * 44.4's "every new logout-shaped route" requirement, matching
 * app/api/auth/logout/route.ts's approach exactly).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { hashResetToken } from "@/lib/passwordResetToken";

const isProduction = process.env.NODE_ENV === "production";

/**
 * isPasswordStrongEnough
 * Same rule set as app/api/auth/register/route.ts — kept as its own
 * copy rather than a shared import since the two files have no other
 * coupling and a shared lib/passwordPolicy.ts would be a one-line-body
 * abstraction for two call sites; flagged here for a future dev pass
 * if a third call site ever needs it.
 */
function isPasswordStrongEnough(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const resetToken: string = (body.resetToken ?? "").trim();
    const newPassword: string = body.newPassword ?? "";

    if (!resetToken) {
      return NextResponse.json(
        { success: false, data: null, message: "This reset link is invalid or has expired. Please start over.", error: "Missing token" },
        { status: 400 }
      );
    }

    if (!isPasswordStrongEnough(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Password must include an uppercase letter, a number, and a special character.",
          error: "Validation failed",
        },
        { status: 400 }
      );
    }

    // The hash is @unique on BuyerRecovery — a direct lookup, not a
    // scan. No anti-enumeration concern here (see file header): a
    // resetToken is high-entropy and single-use, unlike an email
    // address, so "not found" and "expired" can both just fail plainly.
    const resetTokenHash = hashResetToken(resetToken);
    const recovery = await prisma.buyerRecovery.findUnique({
      where: { forgotPasswordResetTokenHash: resetTokenHash },
      select: { userId: true, forgotPasswordResetTokenExpiresAt: true },
    });

    const isExpired =
      !recovery?.forgotPasswordResetTokenExpiresAt ||
      recovery.forgotPasswordResetTokenExpiresAt.getTime() < Date.now();

    if (!recovery || isExpired) {
      await logSecurityEvent({
        eventType: "password_recovery_failed",
        actor: null,
        request,
        details: "Forgot-password: reset attempted with invalid or expired token",
      });
      return NextResponse.json(
        { success: false, data: null, message: "This reset link is invalid or has expired. Please start over.", error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const { userId } = recovery;

    const { data: userData, error: getUserError } = await supabaseAdminClient.auth.admin.getUserById(userId);
    if (getUserError || !userData?.user) {
      console.error("[forgot-password/reset] getUserById failed:", getUserError?.message);
      return NextResponse.json(
        { success: false, data: null, message: "Something went wrong. Please try again.", error: "User lookup failed" },
        { status: 500 }
      );
    }
    const email = userData.user.email ?? null;

    // Updates the password server-side. Per the SUPABASE
    // SESSION-REVOCATION NOTE above, this also revokes every existing
    // refresh token for this user across all devices — no separate
    // "sign out everywhere" call is available or needed.
    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("[forgot-password/reset] updateUserById failed:", updateError.message);
      await logSecurityEvent({
        eventType: "password_recovery_failed",
        actor: email,
        request,
        details: `Forgot-password: password update failed — ${updateError.message}`,
      });
      return NextResponse.json(
        { success: false, data: null, message: "Could not reset your password. Please try again.", error: "Password update failed" },
        { status: 500 }
      );
    }

    // Single-use: clear the resetToken so it can never be replayed,
    // same "cleared once used" convention as the Telegram link fields.
    await prisma.buyerRecovery.update({
      where: { userId },
      data: {
        forgotPasswordResetTokenHash: null,
        forgotPasswordResetTokenExpiresAt: null,
      },
    });

    await logSecurityEvent({
      eventType: "password_recovery_succeeded",
      actor: email,
      request,
      details: "Forgot-password: password reset completed",
    });
    // Reused eventType from the legacy Supabase-native reset flow
    // (app/api/auth/reset-password/route.ts) so both paths land under
    // one consistent label for anyone filtering the Security Logs page.
    await logSecurityEvent({
      eventType: "password_reset_completed",
      actor: email,
      request,
      details: "Password updated via forgot-password recovery flow",
    });

    const response = NextResponse.json({
      success: true,
      data: null,
      message: "Your password has been reset. Please sign in with your new password.",
    });

    // Rule 44 — Origin-Scoped Session Termination. Expires this
    // response's own session cookies (authoritative for THIS browser,
    // if it happened to carry one) and asks the browser to purge
    // cookies/storage/cache for this origin. Matches
    // app/api/auth/logout/route.ts's pattern exactly, per Rule 44.4's
    // requirement that manual logout and this kind of forced
    // termination behave identically.
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

    if (isProduction) {
      response.headers.set("Clear-Site-Data", '"cookies", "storage", "cache"');
    }

    return response;
  } catch (error) {
    console.error("[forgot-password/reset] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
