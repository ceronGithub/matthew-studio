/**
 * FILE: app/api/admin/orders/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.3.1 — Order List Page.
 * Returns a paginated, filterable list of every order across every
 * buyer, newest first. Also handles CSV export when format=csv is
 * passed — same endpoint, different response shape, so the admin
 * UI's filter state stays a single source of truth for both views.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 401 if not
 *    admin/super-admin.
 * 2. Parse filters: status, date range, search (order ID or buyer
 *    email — email requires resolving guestEmail directly, or a
 *    Supabase Auth lookup for registered buyers via userId).
 * 3. Query Order rows (soft-delete excluded per Rule 6), paginated
 *    25/page unless format=csv (CSV exports the full filtered set).
 * 4. Resolve buyer email per row: guestEmail if present, otherwise
 *    a Supabase Auth lookup by userId (same pattern as
 *    app/api/admin/support/tickets/route.ts).
 * 5. Return JSON list+pagination, or a text/csv attachment.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

const PAGE_SIZE = 25;
const VALID_STATUSES = ["pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

interface OrderWhere {
  deletedAt: null;
  status?: string;
  createdAt?: { gte?: Date; lte?: Date };
  OR?: Array<{ id?: { contains: string }; guestEmail?: { contains: string; mode: "insensitive" } }>;
}

/**
 * resolveBuyerEmails
 * Resolves buyer email per order: guestEmail is already on the row
 * for guest checkouts; registered buyers (userId set) need a
 * Supabase Auth lookup. Deduplicates userIds so a buyer with
 * multiple orders on the page only triggers one lookup.
 */
async function resolveBuyerEmails(
  orders: { userId: string | null; guestEmail: string | null }[]
): Promise<Map<string, string | null>> {
  const uniqueUserIds = Array.from(
    new Set(orders.filter((o) => o.userId).map((o) => o.userId as string))
  );
  const emailByUserId = new Map<string, string | null>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data } = await supabaseAdminClient.auth.admin.getUserById(userId);
      emailByUserId.set(userId, data.user?.email ?? null);
    })
  );

  return emailByUserId;
}

function escapeCsvField(value: string): string {
  // Wrap in quotes and escape embedded quotes whenever the field
  // contains a comma, quote, or newline — standard CSV quoting.
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
    const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search")?.trim();

    const where: OrderWhere = { deletedAt: null };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    // Search matches order ID (exact substring) or guest email directly.
    // Registered-buyer email search isn't feasible server-side without
    // scanning all Supabase Auth users, so it's limited to order ID +
    // guest email — documented here rather than silently incomplete.
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { guestEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    // CSV export: no pagination, cap at 5000 rows to avoid an
    // unbounded query on a very large filtered set.
    const isCsv = format === "csv";
    const take = isCsv ? 5000 : PAGE_SIZE;
    const skip = isCsv ? 0 : (page - 1) * PAGE_SIZE;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    const emailByUserId = await resolveBuyerEmails(orders);

    const rows = orders.map((order) => ({
      id: order.id,
      buyerEmail: order.guestEmail ?? emailByUserId.get(order.userId ?? "") ?? null,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    }));

    if (isCsv) {
      const header = "Order ID,Buyer Email,Total,Status,Payment Status,Created Date";
      const lines = rows.map((row) =>
        [
          row.id,
          row.buyerEmail ?? "",
          row.total.toFixed(2),
          row.status,
          row.paymentStatus ?? "",
          row.createdAt.toISOString(),
        ]
          .map((field) => escapeCsvField(String(field)))
          .join(",")
      );
      const csv = [header, ...lines].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: rows,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        page,
      },
      message: "Orders retrieved.",
    });
  } catch (error) {
    console.error("[api/admin/orders GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't load orders. Please try again." },
      { status: 500 }
    );
  }
}
