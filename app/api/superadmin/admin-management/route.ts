/**
 * FILE: app/api/superadmin/admin-management/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same
 * pattern as app/api/superadmin/security-logs/route.ts and
 * app/api/admin/create-admin/route.ts. A regular admin never reaches
 * this route, even with every Section 4.1 permission granted.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.1 (Admin List
 * Page), task-94 (API half, list variant). Returns a paginated,
 * filterable list of admin accounts. Same "no local table" constraint
 * as task-84's buyer list — admin accounts are Supabase Auth users
 * with role="admin" in user_metadata, not a Prisma row, so this
 * route's primary data source is Supabase's Admin API. Also handles
 * CSV export when format=csv is passed (Section 3.2.1's "Export: CSV
 * with all admin data"), same pattern as task-84/task-75.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Page through Supabase Auth's listUsers(), keeping only
 *    role === "admin" (excludes buyers and other super-admins).
 * 3. Apply status/date-range/search filters and sort (newest first)
 *    in memory, then paginate (or take up to 5000 rows for CSV).
 * 4. For just the current page, batch-resolve last login (most recent
 *    SecurityLog login_success row) and locked/active/inactive status
 *    (lib/adminAccountStatus.ts) — never per-row queries in a loop.
 * 5. Return JSON list+pagination, or a text/csv attachment.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getAdminAccountStatusBatch } from "@/lib/adminAccountStatus";

const PAGE_SIZE = 25;
// Same pagination cap precedent as task-84's fetchAllBuyers().
const MAX_AUTH_USERS_PAGES = 10;
const AUTH_USERS_PER_PAGE = 1000;

interface AdminRow {
  adminId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  createdBy: string | null;
  permissions: string[];
  isActiveBan: boolean;
}

/**
 * fetchAllAdmins
 * Pages through Supabase Admin API's listUsers() until it runs out
 * of pages (or hits MAX_AUTH_USERS_PAGES), keeping only role="admin"
 * accounts. isActiveBan mirrors task-84's isActive derivation from
 * banned_until — the source of truth task-95's future deactivate/
 * reactivate action will also write to.
 */
async function fetchAllAdmins(): Promise<AdminRow[]> {
  const admins: AdminRow[] = [];

  for (let page = 1; page <= MAX_AUTH_USERS_PAGES; page++) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const role = (user.user_metadata?.role as string | undefined) ?? null;
      if (role !== "admin") continue;

      const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
      admins.push({
        adminId: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.fullName as string | undefined) ?? null,
        createdAt: user.created_at,
        // Only populated for admins created after this task's small
        // addition to app/api/admin/create-admin/route.ts — null for
        // any admin created before that change (Rule 0D: never
        // invented, surfaced as a real gap instead).
        createdBy: (user.user_metadata?.createdBy as string | undefined) ?? null,
        permissions: Array.isArray(user.user_metadata?.permissions)
          ? (user.user_metadata!.permissions as string[])
          : [],
        isActiveBan: !bannedUntil || bannedUntil.getTime() <= Date.now(),
      });
    }

    if (data.users.length < AUTH_USERS_PER_PAGE) break;
  }

  return admins;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const statusParam = searchParams.get("status");
    const statusFilter =
      statusParam === "active" || statusParam === "inactive" || statusParam === "locked" ? statusParam : undefined;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search")?.trim().toLowerCase();

    let admins = await fetchAllAdmins();

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      admins = admins.filter((row) => new Date(row.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      admins = admins.filter((row) => new Date(row.createdAt).getTime() <= to);
    }
    if (search) {
      admins = admins.filter(
        (row) => row.email?.toLowerCase().includes(search) || row.name?.toLowerCase().includes(search)
      );
    }

    admins.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Status (active/inactive/locked) requires a SecurityLog lookup,
    // so it's resolved for the full filtered set BEFORE the status
    // filter/pagination cut — otherwise a "locked" filter would only
    // ever see whatever page happened to be sliced first.
    const statusByEmail = await getAdminAccountStatusBatch(
      admins.map((row) => ({ email: row.email, isActiveBan: row.isActiveBan }))
    );

    let rows = admins.map((row) => ({
      ...row,
      status: (row.email ? statusByEmail.get(row.email) : undefined) ?? "active",
    }));

    if (statusFilter) {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    const totalCount = rows.length;
    const isCsv = format === "csv";
    const take = isCsv ? 5000 : PAGE_SIZE;
    const skip = isCsv ? 0 : (page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(skip, skip + take);

    // Batch-resolve last login for just this page — never a per-row
    // query, same discipline as task-84's fetchAllBuyers() callers.
    const pageEmails = pageRows.map((row) => row.email).filter((email): email is string => Boolean(email));
    const recentLogins = pageEmails.length
      ? await prisma.securityLog.findMany({
          where: { eventType: "login_success", actor: { in: pageEmails } },
          orderBy: { createdAt: "desc" },
          select: { actor: true, createdAt: true },
        })
      : [];

    const lastLoginByEmail = new Map<string, Date>();
    for (const login of recentLogins) {
      if (login.actor && !lastLoginByEmail.has(login.actor)) {
        lastLoginByEmail.set(login.actor, login.createdAt);
      }
    }

    const result = pageRows.map((row) => ({
      adminId: row.adminId,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      lastLoginAt: (row.email && lastLoginByEmail.get(row.email)?.toISOString()) ?? null,
      status: row.status,
      permissions: row.permissions,
    }));

    if (isCsv) {
      const header = "Email,Name,Created Date,Created By,Last Login,Status,Permissions";
      const lines = result.map((row) =>
        [
          row.email ?? "",
          row.name ?? "",
          row.createdAt,
          row.createdBy ?? "",
          row.lastLoginAt ?? "",
          row.status,
          row.permissions.join("; "),
        ]
          .map((field) => escapeCsvField(String(field)))
          .join(",")
      );
      const csv = [header, ...lines].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="admin-management-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        admins: result,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Admin accounts retrieved.",
    });
  } catch (error) {
    console.error("[api/superadmin/admin-management GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load admin accounts. Please try again." },
      { status: 500 }
    );
  }
}
