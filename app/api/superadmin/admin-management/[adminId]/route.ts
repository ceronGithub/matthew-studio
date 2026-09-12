/**
 * FILE: app/api/superadmin/admin-management/[adminId]/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the list route in the parent folder.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.3 (Admin Details &
 * Edit Page, read half), task-94 (API half, detail variant). Returns
 * everything the detail/edit page needs in one call: email, full
 * name, role, created date + creator email, last login (date/time +
 * IP + city-level location), current status, and permissions.
 * Mutations (name/permissions edit, deactivate, reset-password,
 * delete) are explicitly out of scope here — task-95.
 *
 * DATA FLOW:
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
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { getAdminAuthUser } from "@/lib/getAdminAuthUser";
import { getAdminAccountStatus } from "@/lib/adminAccountStatus";

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
