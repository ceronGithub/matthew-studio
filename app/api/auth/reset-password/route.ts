/**
 * FILE: app/api/auth/reset-password/route.ts
 * PURPOSE:
 * Security-logging endpoint only. The actual password update happens
 * client-side (ResetPasswordForm calls supabaseBrowserClient.auth.
 * updateUser() using the temporary recovery session Supabase's SDK
 * establishes from the email link) — Supabase itself is the source of
 * truth for whether that succeeded. This route just records the event
 * to SecurityLog once the client confirms success, matching the
 * login_success / registration_success logging pattern used elsewhere
 * on this page.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    // CSRF check (Rule 32.2). The password change itself already
    // happened client-side via Supabase before this call — this only
    // guards the SecurityLog write from being forged/spoofed.
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email: string = (body.email ?? "").trim();

    await logSecurityEvent({
      eventType: "password_reset_completed",
      actor: email || null,
      request,
      details: "Password updated via recovery link",
    });

    return NextResponse.json({ success: true, data: null, message: "Password reset logged." });
  } catch (error) {
    // Logging failure here should never surface to the user — the
    // password change on the Supabase side already succeeded by the
    // time this is called.
    console.error("[auth/reset-password] Logging error:", (error as Error).message);
    return NextResponse.json({ success: true, data: null, message: "Password reset logged." });
  }
}
