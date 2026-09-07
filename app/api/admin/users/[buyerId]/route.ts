/**
 * FILE: app/api/admin/users/[buyerId]/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.4.2 — Buyer Details page.
 * Returns everything task-88's UI needs in one call: account info,
 * last login (city-level location + IP, from SecurityLog), 5 most
 * recent orders, last 10 account-activity entries, and internal
 * notes (task-83's BuyerAdminMeta) — same one-call shape as task-76's
 * order detail route.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Look up the buyer's Supabase Auth user by id (task-84's list
 *    route is the only other place this app reads Supabase Auth
 *    directly for buyers — same "no local Buyer table" constraint).
 *    404 if not found, or found but role isn't "buyer" (an admin/
 *    super-admin id typed into the URL should not resolve here).
 * 3. Account info: email, name, account-created date, active status
 *    (banned_until) all come off the Auth user record. Phone is not
 *    collected anywhere in this app's checkout/registration flow —
 *    surfaced as null rather than invented (same gap task-76/84 both
 *    already flag).
 * 4. Last login + IP + city: most recent SecurityLog row with
 *    eventType "login_success" and actor === this buyer's email.
 * 5. Order history: 5 most recent (non-soft-deleted) Orders for this
 *    userId, newest first.
 * 6. Account activity: last 10 AccountActivityLog rows for this
 *    buyer. KNOWN GAP — recordAccountActivity() is currently only
 *    wired into app/superAdmin/layout.tsx (Rule 42.3); no buyer-facing
 *    layout calls it yet, so this section will be empty until that
 *    instrumentation is added as its own task. Queried here anyway so
 *    the UI's three-state pattern (loading/empty/error, Rule 25) has
 *    a real endpoint to hit rather than a stub.
 * 7. Internal notes: BuyerAdminMeta.internalNotes (task-83), same
 *    append-only Json-array shape as Order.internalNotes.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

interface InternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { buyerId } = await params;

    // Resolve the buyer's Supabase Auth user — this is the primary
    // source of truth for account info since there is no local
    // Buyer/User table (same constraint as task-76/84).
    const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.getUserById(buyerId);
    const authUser = authData?.user;

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that buyer. They may have been removed." },
        { status: 404 }
      );
    }

    const role = (authUser.user_metadata?.role as string | undefined) ?? "buyer";
    if (role !== "buyer") {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that buyer. They may have been removed." },
        { status: 404 }
      );
    }

    const bannedUntil = authUser.banned_until ? new Date(authUser.banned_until) : null;
    const isActive = !bannedUntil || bannedUntil.getTime() <= Date.now();
    const email = authUser.email ?? null;

    // Batch-fetch everything else in parallel — never sequential
    // round trips for independent data.
    const [lastLogin, recentOrders, recentActivity, adminMeta] = await Promise.all([
      email
        ? prisma.securityLog.findFirst({
            where: { eventType: "login_success", actor: email },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, ipAddress: true, geoCity: true, geoCountry: true },
          })
        : Promise.resolve(null),
      prisma.order.findMany({
        where: { userId: buyerId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, total: true, status: true },
      }),
      prisma.accountActivityLog.findMany({
        where: { accountId: buyerId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { action: true, ipAddress: true, geoCity: true, deviceType: true, createdAt: true },
      }),
      prisma.buyerAdminMeta.findUnique({
        where: { userId: buyerId },
        select: { internalNotes: true },
      }),
    ]);

    const internalNotes = (adminMeta?.internalNotes as InternalNoteEntry[] | null) ?? [];

    return NextResponse.json({
      success: true,
      data: {
        account: {
          userId: authUser.id,
          email,
          name: (authUser.user_metadata?.fullName as string | undefined) ?? null,
          phone: null, // not collected anywhere in this app's flow — see file header
          createdAt: authUser.created_at,
          isActive,
          lastLogin: lastLogin
            ? {
                at: lastLogin.createdAt,
                ipAddress: lastLogin.ipAddress,
                geoCity: lastLogin.geoCity,
                geoCountry: lastLogin.geoCountry,
              }
            : null,
        },
        orders: recentOrders.map((order: { id: string; createdAt: Date; total: number; status: string }) => ({
          id: order.id,
          createdAt: order.createdAt,
          total: order.total,
          status: order.status,
        })),
        activity: recentActivity.map(
          (entry: { action: string; ipAddress: string | null; geoCity: string | null; deviceType: string | null; createdAt: Date }) => ({
            action: entry.action,
            ipAddress: entry.ipAddress,
            geoCity: entry.geoCity,
            deviceType: entry.deviceType,
            createdAt: entry.createdAt,
          })
        ),
        internalNotes,
      },
      message: "Buyer details retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/users/[buyerId] GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load this buyer. Please try again." },
      { status: 500 }
    );
  }
}
