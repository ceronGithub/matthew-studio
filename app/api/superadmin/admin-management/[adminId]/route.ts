/**
 * FILE: app/api/superadmin/admin-management/[adminId]/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the list route in the parent folder.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.3 (Admin Details &
 * Edit Page). GET (task-94) returns everything the detail/edit page
 * needs: email, full name, role, created date + creator email, last
 * login, current status, and permissions. PATCH/DELETE (task-95) add
 * the mutation half — editing name/permissions and permanent delete.
 * The other two Section 3.2.3 actions (deactivate/reactivate,
 * reset-password) live in their own sub-routes — see
 * ./toggle-status/route.ts and ./reset-password/route.ts — since they
 * don't fit PATCH's "edit fields" shape or DELETE's semantics.
 *
 * DATA FLOW (GET):
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Look up the target's Supabase Auth user by id
 *    (lib/getAdminAuthUser.ts) — 404 if not found or not role
 *    "admin" (a buyer or super-admin id typed into the URL should
 *    never resolve here).
 * 3. Last login + IP + city/country: most recent SecurityLog row with
 *    eventType "login_success" and actor === this admin's email.
 * 4. Status: lib/adminAccountStatus.ts (active/inactive/locked — see
 *    that file's header for the "locked" grounding note).
 *
 * DATA FLOW (PATCH):
 * 1. Same auth/lookup as GET.
 * 2. Validate fullName (>=2 chars, if provided) and permissions
 *    (must all be in KNOWN_PERMISSIONS, if provided) — same validation
 *    shape as app/api/admin/create-admin/route.ts.
 * 3. Merge into the existing user_metadata (never overwrite role or
 *    createdBy — this route only ever touches fullName/permissions)
 *    via supabaseAdminClient.auth.admin.updateUserById().
 * 4. Log admin_updated to SecurityLog (Rule 38), naming the affected
 *    admin's email — never the raw permissions array (avoid bloating
 *    SecurityLog.details with structured data it isn't meant to hold).
 *
 * DATA FLOW (DELETE):
 * 1. Same auth/lookup as GET (also guarantees the target is role
 *    "admin" — a super-admin id can never resolve here, so this route
 *    can never be used to delete another super-admin, self included).
 * 2. Permanently deletes the Supabase Auth user. The 5-second
 *    confirmation delay from Section 3.2.1 is a UI concern (Rule
 *    34.4) that lives in the button, not here — this route executes
 *    immediately once called.
 * 3. Logs admin_deleted to SecurityLog before the delete call so the
 *    log write still lands even if the delete itself throws.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { getAdminAuthUser } from "@/lib/getAdminAuthUser";
import { getAdminAccountStatus } from "@/lib/adminAccountStatus";
import { logSecurityEvent } from "@/lib/securityLog";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

// Section 4.1's known permission strings — same literal list as
// app/api/admin/create-admin/route.ts (that file's own comment
// explains why this is kept as a duplicated literal rather than a
// shared import: it's validating a request body before any Supabase
// call, not checking an already-created user's permissions).
const KNOWN_PERMISSIONS = [
  "manage-products",
  "manage-orders",
  "manage-users",
  "view-analytics",
  "view-security-logs",
  "manage-promotions",
] as const;

export async function GET(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { adminId } = await params;

    const authUser = await getAdminAuthUser(adminId);
    if (!authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that admin account. It may have been removed." },
        { status: 404 }
      );
    }

    const email = authUser.email ?? null;
    const bannedUntil = authUser.banned_until ? new Date(authUser.banned_until) : null;
    const isActiveBan = !bannedUntil || bannedUntil.getTime() <= Date.now();

    const [lastLogin, status] = await Promise.all([
      email
        ? prisma.securityLog.findFirst({
            where: { eventType: "login_success", actor: email },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, ipAddress: true, geoCity: true, geoCountry: true },
          })
        : Promise.resolve(null),
      getAdminAccountStatus(email, isActiveBan),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        adminId: authUser.id,
        email,
        name: (authUser.user_metadata?.fullName as string | undefined) ?? null,
        role: (authUser.user_metadata?.role as string | undefined) ?? "admin",
        createdAt: authUser.created_at,
        // Only populated for admins created after this task's small
        // addition to app/api/admin/create-admin/route.ts — null for
        // any admin created before that change (Rule 0D: never
        // invented, surfaced as a real gap instead).
        createdBy: (authUser.user_metadata?.createdBy as string | undefined) ?? null,
        lastLogin: lastLogin
          ? {
              at: lastLogin.createdAt.toISOString(),
              ipAddress: lastLogin.ipAddress,
              geoCity: lastLogin.geoCity,
              geoCountry: lastLogin.geoCountry,
            }
          : null,
        status,
        permissions: Array.isArray(authUser.user_metadata?.permissions)
          ? (authUser.user_metadata!.permissions as string[])
          : [],
      },
      message: "Admin account retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/admin-management/[adminId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load this admin account. Please try again." },
      { status: 500 }
    );
  }
}

interface EditAdminBody {
  fullName?: string;
  permissions?: string[];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { adminId } = await params;

    const authUser = await getAdminAuthUser(adminId);
    if (!authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that admin account. It may have been removed." },
        { status: 404 }
      );
    }

    const body: EditAdminBody = await request.json();

    // Both fields are optional per-request (a super-admin may only be
    // changing one of the two), but each is validated when present —
    // never silently accept an empty name or an unrecognized
    // permission string.
    let fullName = (authUser.user_metadata?.fullName as string | undefined) ?? null;
    if (body.fullName !== undefined) {
      const trimmedName = body.fullName.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { success: false, data: null, message: "Please enter a full name (at least 2 characters)." },
          { status: 400 }
        );
      }
      fullName = trimmedName;
    }

    let permissions = Array.isArray(authUser.user_metadata?.permissions)
      ? (authUser.user_metadata!.permissions as string[])
      : [];
    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions)) {
        return NextResponse.json(
          { success: false, data: null, message: "Permissions must be a list." },
          { status: 400 }
        );
      }
      const invalidPermission = body.permissions.find(
        (permission) => !KNOWN_PERMISSIONS.includes(permission as (typeof KNOWN_PERMISSIONS)[number])
      );
      if (invalidPermission) {
        return NextResponse.json(
          { success: false, data: null, message: `"${invalidPermission}" is not a recognized permission.` },
          { status: 400 }
        );
      }
      permissions = body.permissions;
    }

    // Merge into existing user_metadata rather than replacing it
    // outright — role and createdBy must survive this update
    // untouched; this route only ever writes fullName/permissions.
    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(adminId, {
      user_metadata: {
        ...authUser.user_metadata,
        fullName,
        permissions,
      },
    });
    if (updateError) {
      console.error("[api/superadmin/admin-management/[adminId] PATCH] Supabase update failed:", updateError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't save these changes. Please try again." },
        { status: 500 }
      );
    }

    await logSecurityEvent({
      eventType: "admin_updated",
      actor: admin.email,
      request,
      details: `Admin ${authUser.email ?? adminId}: name/permissions updated`,
    });

    return NextResponse.json({
      success: true,
      data: { adminId, name: fullName, permissions },
      message: "Admin account updated successfully.",
    });
  } catch (error) {
    console.error("[api/superadmin/admin-management/[adminId] PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't save these changes. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { adminId } = await params;

    const authUser = await getAdminAuthUser(adminId);
    if (!authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that admin account. It may have been removed." },
        { status: 404 }
      );
    }

    // Logged before the delete call so the audit trail survives even
    // if deleteUser() itself throws partway through.
    await logSecurityEvent({
      eventType: "admin_deleted",
      actor: admin.email,
      request,
      details: `Admin ${authUser.email ?? adminId}: account permanently deleted`,
    });

    const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(adminId);
    if (deleteError) {
      console.error("[api/superadmin/admin-management/[adminId] DELETE] Supabase delete failed:", deleteError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't delete this admin account. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: "Admin account deleted permanently.",
    });
  } catch (error) {
    console.error("[api/superadmin/admin-management/[adminId] DELETE] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't delete this admin account. Please try again." },
      { status: 500 }
    );
  }
}
