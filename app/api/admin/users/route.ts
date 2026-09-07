/**
 * FILE: app/api/admin/users/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.4.1 — Buyer List Page.
 * Returns a paginated, filterable list of buyer accounts. There is no
 * local Buyer/User table in this schema (same constraint task-34/76
 * already worked around) — buyers ARE Supabase Auth users, so this
 * route's primary data source is Supabase's Admin API, not Prisma.
 * Also handles CSV export when format=csv is passed, same pattern as
 * task-75's orders list route.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Fetch every Supabase Auth user (Admin API listUsers) and keep
 *    only role "buyer" — admins/super-admins are Supabase Auth users
 *    too (see app/api/auth/login/route.ts's user_metadata.role), so
 *    this filter is required, not optional. Supabase's Admin API has
 *    no server-side full-text filter (same "list and match" precedent
 *    as lib/getUserByEmail.ts) — acceptable at this project's scale;
 *    flagged here rather than silently unbounded if the buyer base
 *    ever grows large enough to matter.
 * 3. Apply status/date-range/search filters and sort (newest first)
 *    entirely in memory against the fetched list, then paginate
 *    (or take the full filtered set, capped at 5000, for CSV).
 * 4. For just the current page's buyers, batch-resolve Order
 *    aggregates (count + lifetime value) via one groupBy, and last
 *    login (most recent SecurityLog login_success row) via one query
 *    — never per-row queries in a loop.
 * 5. Return JSON list+pagination, or a text/csv attachment.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

const PAGE_SIZE = 25;
// Supabase Admin API pagination cap while fetching the full buyer
// list — matches the CSV export's own 5000-row cap elsewhere in this
// admin area (task-75), so no path in this feature is truly unbounded.
const MAX_AUTH_USERS_PAGES = 10;
const AUTH_USERS_PER_PAGE = 1000;

interface BuyerRow {
  userId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  isActive: boolean;
}

/**
 * fetchAllBuyers
 * Pages through Supabase Admin API's listUsers() until it runs out
 * of pages (or hits MAX_AUTH_USERS_PAGES), keeping only role "buyer"
 * accounts. Status is derived from banned_until: a future timestamp
 * means the account is currently banned/deactivated.
 */
async function fetchAllBuyers(): Promise<BuyerRow[]> {
  const buyers: BuyerRow[] = [];

  for (let page = 1; page <= MAX_AUTH_USERS_PAGES; page++) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const role = (user.user_metadata?.role as string | undefined) ?? "buyer";
      if (role !== "buyer") continue;

      const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
      buyers.push({
        userId: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.fullName as string | undefined) ?? null,
        createdAt: user.created_at,
        isActive: !bannedUntil || bannedUntil.getTime() <= Date.now(),
      });
    }

    if (data.users.length < AUTH_USERS_PER_PAGE) break;
  }

  return buyers;
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const statusParam = searchParams.get("status");
    const status = statusParam === "active" || statusParam === "inactive" ? statusParam : undefined;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search")?.trim().toLowerCase();

    let buyers = await fetchAllBuyers();

    if (status) {
      buyers = buyers.filter((buyer) => (status === "active" ? buyer.isActive : !buyer.isActive));
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      buyers = buyers.filter((buyer) => new Date(buyer.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      buyers = buyers.filter((buyer) => new Date(buyer.createdAt).getTime() <= to);
    }
    if (search) {
      buyers = buyers.filter(
        (buyer) => buyer.email?.toLowerCase().includes(search) || buyer.name?.toLowerCase().includes(search)
      );
    }

    buyers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = buyers.length;
    const isCsv = format === "csv";
    const take = isCsv ? 5000 : PAGE_SIZE;
    const skip = isCsv ? 0 : (page - 1) * PAGE_SIZE;
    const pageBuyers = buyers.slice(skip, skip + take);

    // Batch-resolve Order aggregates + last login for just this
    // page's buyers — never a per-row query.
    const pageUserIds = pageBuyers.map((buyer) => buyer.userId);
    const pageEmails = pageBuyers.map((buyer) => buyer.email).filter((email): email is string => Boolean(email));

    const [orderAggregates, recentLogins] = await Promise.all([
      pageUserIds.length
        ? prisma.order.groupBy({
            by: ["userId"],
            where: { userId: { in: pageUserIds }, deletedAt: null },
            _count: { _all: true },
            _sum: { total: true },
          })
        : Promise.resolve([]),
      pageEmails.length
        ? prisma.securityLog.findMany({
            where: { eventType: "login_success", actor: { in: pageEmails } },
            orderBy: { createdAt: "desc" },
            select: { actor: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const ordersByUserId = new Map(orderAggregates.map((row) => [row.userId, row]));
    const lastLoginByEmail = new Map<string, Date>();
    for (const login of recentLogins) {
      if (login.actor && !lastLoginByEmail.has(login.actor)) {
        lastLoginByEmail.set(login.actor, login.createdAt);
      }
    }

    const rows = pageBuyers.map((buyer) => ({
      userId: buyer.userId,
      email: buyer.email,
      name: buyer.name,
      createdAt: buyer.createdAt,
      lastLoginAt: (buyer.email && lastLoginByEmail.get(buyer.email)?.toISOString()) ?? null,
      isActive: buyer.isActive,
      totalOrders: ordersByUserId.get(buyer.userId)?._count._all ?? 0,
      lifetimeValue: ordersByUserId.get(buyer.userId)?._sum.total ?? 0,
    }));

    if (isCsv) {
      const header = "Email,Name,Account Created,Last Login,Status,Total Orders,Lifetime Value";
      const lines = rows.map((row) =>
        [
          row.email ?? "",
          row.name ?? "",
          row.createdAt,
          row.lastLoginAt ?? "",
          row.isActive ? "Active" : "Inactive",
          String(row.totalOrders),
          row.lifetimeValue.toFixed(2),
        ]
          .map((field) => escapeCsvField(String(field)))
          .join(",")
      );
      const csv = [header, ...lines].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="buyers-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        buyers: rows,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Buyers retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/users GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load buyers. Please try again." },
      { status: 500 }
    );
  }
}
