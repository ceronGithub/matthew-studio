/**
 * FILE: app/api/admin/profile/route.ts
 * ROLE: Admin/super-admin only — not in middleware.ts's matcher (same
 * reason lib/getSessionAdmin.ts exists), so this route does its own
 * request-scoped session check.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.8 (task-44, API half).
 * Editable fields (fullName, notificationPrefs) live in Supabase
 * user_metadata — this project has no local Admin/User table (same
 * convention as app/api/buyer/profile/route.ts). Email, role, and
 * account-created date are read-only. Permissions are read-only here
 * too — editing them is super-admin-only per Section 4.2.
 *
 * Avatar upload has its own route (avatar/route.ts, mirrors the buyer
 * one). Password change has its own route (password/route.ts —
 * requires current-password verification, unlike a plain profile
 * save). Notification toggle saves also live on their own route
 * (notifications/route.ts) since Section 3.8 saves each toggle
 * immediately, separately from the "Save Profile" button here.
 *
 * PUT merges into the existing user_metadata (never replaces it
 * outright) so role/permissions/avatarUrl/notificationPrefs set
 * elsewhere are never accidentally wiped by a name-only save.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";

// Same forbidden-character first line of defense as buyer profile/route.ts (Rule 18.1).
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

const DEFAULT_NOTIFICATION_PREFS = {
  newOrder: true,
  lowStock: true,
  weeklySummary: false,
};

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    // getSessionAdmin() only returns id/email/role — fetch the full
    // user record for metadata (fullName, avatarUrl, permissions,
    // notificationPrefs), same pattern as lib/hasAdminPermission.ts.
    const { data, error } = await supabaseAdminClient.auth.admin.getUserById(admin.id);
    if (error || !data.user) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't load your profile. Please try again." },
        { status: 500 }
      );
    }

    const metadata = data.user.user_metadata ?? {};
    return NextResponse.json({
      success: true,
      data: {
        fullName: metadata.fullName ?? "",
        avatarUrl: metadata.avatarUrl ?? null,
        email: data.user.email,
        role: admin.role,
        permissions: admin.role === "superAdmin" ? [] : (metadata.permissions as string[] | undefined) ?? [],
        createdAt: data.user.created_at,
        notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(metadata.notificationPrefs ?? {}) },
      },
      message: "Profile fetched successfully.",
    });
  } catch (error) {
    console.error("[api/admin/profile GET] Unexpected error:", error);
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

    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");

    if (fullName.length < 2) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your full name.", error: "Validation failed" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdminClient.auth.admin.getUserById(admin.id);

    const { error } = await supabaseAdminClient.auth.admin.updateUserById(admin.id, {
      user_metadata: { ...existing.user?.user_metadata, fullName },
    });

    if (error) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't save your changes. Please try again in a moment.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { fullName },
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error("[api/admin/profile PUT] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save your changes. Please try again in a moment." },
      { status: 500 }
    );
  }
}
