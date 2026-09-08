/**
 * FILE: app/api/admin/profile/notifications/route.ts
 * ROLE: Admin/super-admin only — not in middleware.ts's matcher, so
 * this route does its own request-scoped session check (same reason
 * as app/api/admin/profile/route.ts).
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.8's "Notification
 * Preferences" block (task-44, API half). Each toggle saves
 * immediately (no separate "Save" button per the spec), so this is a
 * single-key PUT rather than a full-form PUT like the main profile
 * route — the UI calls this once per toggle flip and shows its own
 * toast for that one change.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { isValidCsrfRequest } from "@/lib/csrf";

const ALLOWED_KEYS = ["newOrder", "lowStock", "weeklySummary"] as const;
type NotificationPrefKey = (typeof ALLOWED_KEYS)[number];

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
    const key = body.key as string;
    const value = body.value;

    if (!ALLOWED_KEYS.includes(key as NotificationPrefKey) || typeof value !== "boolean") {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid preference.", error: "Validation failed" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdminClient.auth.admin.getUserById(admin.id);
    const currentPrefs = (existing.user?.user_metadata?.notificationPrefs as Record<string, boolean>) ?? {};

    const { error } = await supabaseAdminClient.auth.admin.updateUserById(admin.id, {
      user_metadata: {
        ...existing.user?.user_metadata,
        notificationPrefs: { ...currentPrefs, [key]: value },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't save that preference. Please try again.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { key, value },
      message: "Preference saved.",
    });
  } catch (error) {
    console.error("[api/admin/profile/notifications] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save that preference. Please try again." },
      { status: 500 }
    );
  }
}
