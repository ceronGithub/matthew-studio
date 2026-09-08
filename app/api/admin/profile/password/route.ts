/**
 * FILE: app/api/admin/profile/password/route.ts
 * ROLE: Admin/super-admin only — not in middleware.ts's matcher, so
 * this route does its own request-scoped session check (same reason
 * as app/api/admin/profile/route.ts).
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.8's "Change Password"
 * block (task-44, API half). Unlike a plain profile save, this
 * requires the admin to re-enter their CURRENT password — verified
 * by attempting supabaseServerClient.auth.signInWithPassword() with
 * it (same call app/api/auth/login/route.ts uses), never by trusting
 * a client-side check alone (Rule 6). On success, updates the
 * password via supabaseAdminClient.auth.admin.updateUserById(),
 * same as app/api/auth/forgot-password/reset/route.ts.
 *
 * SESSION NOTE (flagged for developer awareness, not a blocker):
 * Section 3.8 asks for "forces re-login on other active sessions,
 * current session stays active." Supabase's GoTrue revokes ALL
 * existing refresh tokens for a user the instant updateUserById()
 * changes their password — including this browser's — so this route
 * deliberately does NOT clear this response's own session cookies
 * (unlike Rule 44's logout-shaped routes). The admin's short-lived
 * access token (sb-access-token) keeps working until its own natural
 * expiry even though the refresh token behind it is now dead, which
 * is what makes "current session stays active" true in practice; a
 * true per-device session model would need Rule 32.3's refresh-token
 * rotation, out of scope for this task.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServerClient, supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/securityLog";
import { recordAccountActivity } from "@/lib/accountActivity";

/**
 * isPasswordStrongEnough
 * Same rule set as app/api/auth/register/route.ts and
 * app/api/auth/forgot-password/reset/route.ts — kept as its own copy
 * per those files' existing convention (no shared lib for a two-line
 * body, flagged there for a future consolidation pass).
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

export async function PUT(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const admin = await getSessionAdmin(request);
    if (!admin || !admin.email) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const currentPassword: string = body.currentPassword ?? "";
    const newPassword: string = body.newPassword ?? "";
    const confirmNewPassword: string = body.confirmNewPassword ?? "";

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your current password.", error: "Validation failed" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { success: false, data: null, message: "New passwords do not match.", error: "Validation failed" },
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

    // Verify the current password by attempting a real sign-in —
    // never trust a client-side "confirm current password" check
    // alone (Rule 6). Never mutates cookies/session state — this call
    // only tells us whether the credential is correct.
    const { error: signInError } = await supabaseServerClient.auth.signInWithPassword({
      email: admin.email,
      password: currentPassword,
    });

    if (signInError) {
      await logSecurityEvent({
        eventType: "login_failed",
        actor: admin.email,
        request,
        details: "Admin profile: password change attempted with incorrect current password",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Current password is incorrect.", error: "Invalid credentials" },
        { status: 400 }
      );
    }

    // Updates the password server-side. Per the SESSION NOTE above,
    // this revokes every other refresh token for this admin — the
    // intended "sign out other sessions" behavior from Section 3.8.
    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(admin.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("[api/admin/profile/password] updateUserById failed:", updateError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't update your password. Please try again.", error: updateError.message },
        { status: 500 }
      );
    }

    await logSecurityEvent({
      eventType: "password_reset_completed",
      actor: admin.email,
      request,
      details: "Password updated via admin profile settings",
    });

    // Rule 42 — self-service account changes are activity, not a
    // security event on their own; both logs are written per Rule
    // 38.1's separation (this IS also security-relevant, hence both).
    await recordAccountActivity({
      accountId: admin.id,
      action: "profile_updated",
      request,
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("[api/admin/profile/password] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't update your password. Please try again." },
      { status: 500 }
    );
  }
}
