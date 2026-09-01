/**
 * FILE: app/api/auth/check-email/route.ts
 * PURPOSE:
 * Reports whether an email is already registered. Uses the Supabase
 * admin client (service role) because the auth.users table isn't
 * queryable through the anon key — this is the one operation on this
 * page that needs the elevated key.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export async function GET(request: Request) {
  try {
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
