/**
 * FILE: app/api/buyer/profile/route.ts
 * ROLE: Buyer only — already guarded by middleware.ts (role "buyer").
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.2. Editable fields
 * (fullName, displayName, phone) live in Supabase user_metadata —
 * this project has no local User table (AdminSession's header
 * comment: Supabase Auth is the single source of identity). Email and
 * account-created date are read-only here (changing email is a
 * separate, security-sensitive flow, out of scope per the spec).
 *
 * Uses supabaseAdminClient.auth.admin.updateUserById rather than the
 * spec's literal "browserClient" suggestion — this app's session is
 * an HttpOnly server cookie the browser-side Supabase JS client can
 * never read, so updates have to go through a server route the same
 * way every other auth-adjacent action in this app already does.
 *
 * PUT merges into the existing user_metadata (never replaces it
 * outright) so unrelated fields like role/avatarUrl set elsewhere are
 * never accidentally wiped by a profile-only save.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getSessionUser } from "@/lib/getSessionUserId";
import { isValidCsrfRequest } from "@/lib/csrf";

// Same forbidden-character first line of defense already used on the
// registration form's fullName field (Rule 18.1).
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const metadata = user.user_metadata ?? {};
    return NextResponse.json({
      success: true,
      data: {
        fullName: metadata.fullName ?? "",
        displayName: metadata.displayName ?? metadata.fullName ?? "",
        phone: metadata.phone ?? "",
        avatarUrl: metadata.avatarUrl ?? null,
        email: user.email,
        createdAt: user.created_at,
      },
      message: "Profile fetched successfully.",
    });
  } catch (error) {
    console.error("[api/buyer/profile GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load your profile. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
    const displayName = String(body.displayName ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
    const phone = String(body.phone ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");

    if (fullName.length < 2) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your full name.", error: "Validation failed" },
        { status: 400 }
      );
    }

    // Merge into existing metadata — never overwrite role/avatarUrl/etc.
    // that this route doesn't own.
    const { error } = await supabaseAdminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, fullName, displayName, phone },
    });

    if (error) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't save your changes. Please try again in a moment.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { fullName, displayName, phone },
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error("[api/buyer/profile PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save your changes. Please try again in a moment." },
      { status: 500 }
    );
  }
}
