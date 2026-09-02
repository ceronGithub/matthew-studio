/**
 * FILE: app/api/auth/check-email/route.ts
 * PURPOSE:
 * Reports whether an email is already registered. Uses the Supabase
 * admin client (service role) because the auth.users table isn't
 * queryable through the anon key — this is the one operation on this
 * page that needs the elevated key.
 *
 * Called from RegisterForm.tsx on a debounce (500ms after the user
 * stops typing), so real usage stays well under this route's own
 * rate limit — the limit exists as a backstop against a scripted
 * caller bypassing the client-side debounce entirely.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// General API tier per Rule 32.1 — this endpoint reveals no more than
// a single yes/no per call, so it doesn't need login/register's
// stricter limits, just a backstop against abuse.
const CHECK_EMAIL_MAX_ATTEMPTS = 100;
const CHECK_EMAIL_WINDOW_MINUTES = 15;

export async function GET(request: Request) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(
      ipAddress,
      "check-email",
      CHECK_EMAIL_MAX_ATTEMPTS,
      CHECK_EMAIL_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const email = new URL(request.url).searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { success: false, data: null, message: "Provide an email to check." },
        { status: 400 }
      );
    }

    // Supabase's admin API doesn't support filtering by exact email
    // directly, so list and match — fine at this scale, revisit with a
    // dedicated lookup if the user base grows large enough to matter.
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers();
    if (error) {
      throw error;
    }

    const emailExists = data.users.some((user) => user.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({
      success: true,
      data: { available: !emailExists },
      message: "Email availability checked.",
    });
  } catch (error) {
    console.error("[auth/check-email] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Could not check email right now.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
