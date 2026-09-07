/**
 * FILE: lib/adminDashboardStats.ts
 * PURPOSE:
 * Read-only aggregation queries for app/admin/dashboard/page.tsx
 * (admin_account_specification.md Section 3.1). Mirrors
 * lib/dashboardStats.ts's pattern for the super-admin dashboard:
 * pure data-fetching, no writes, every query fails soft so a stats
 * outage never takes down the dashboard shell itself.
 *
 * Customer identity for orders comes from Supabase Auth
 * (supabaseAdminClient.auth.admin.getUserById), not a local User
 * table — this repo has none (see prisma/schema.prisma header).
 * Guest orders fall back to Order.guestEmail.
 */
import { prisma } from "@/services/prisma";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export interface AdminQuickStats {
  totalProducts: number;
  ordersLast7Days: number;
  revenueLast7Days: number;
  pendingOrders: number;
  averageOrderValue: number;
}

export interface RecentOrderRow {
  id: string;
  status: string;
  customerLabel: string;
  total: number;
  createdAt: Date;
}

export interface RecentProductRow {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
}

export interface AdminDashboardAlerts {
  pendingOrdersCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * getAdminQuickStats
 * Section 3.1 #2 — total products, orders (7d), revenue (7d),
 * pending orders, and average order value. Revenue/AOV are computed
 * from Order.total on non-deleted, non-pending-failure rows (paid +
 * fulfillment-stage statuses) so a stack of abandoned "pending"
 * checkouts never inflates revenue.
 */
export async function getAdminQuickStats(): Promise<AdminQuickStats> {
  try {
    const since7d = new Date(Date.now() - SEVEN_DAYS_MS);
    const revenueStatuses = ["PAID", "Confirmed", "Shipped", "Delivered"];

    const [totalProducts, ordersLast7Days, pendingOrders, revenueAgg] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.order.count({ where: { deletedAt: null, createdAt: { gte: since7d } } }),
      prisma.order.count({ where: { deletedAt: null, status: "pending" } }),
      prisma.order.aggregate({
        where: { deletedAt: null, status: { in: revenueStatuses }, createdAt: { gte: since7d } },
        _sum: { total: true },
        _avg: { total: true },
      }),
    ]);

    return {
      totalProducts,
      ordersLast7Days,
      revenueLast7Days: revenueAgg._sum.total ?? 0,
      pendingOrders,
      averageOrderValue: revenueAgg._avg.total ?? 0,
    };
  } catch (error) {
    console.error("[adminDashboardStats] Failed to load quick stats:", (error as Error).message);
    return {
      totalProducts: 0,
      ordersLast7Days: 0,
      revenueLast7Days: 0,
      pendingOrders: 0,
      averageOrderValue: 0,
    };
  }
}

/**
 * getRecentOrders
 * Section 3.1 #1 — last N orders with status, customer, amount, and
 * created date. Batches unique userIds into one Supabase lookup pass
 * (same dedup pattern as app/api/admin/support/tickets/route.ts)
 * rather than one lookup per row.
 */
export async function getRecentOrders(limit: number = 10): Promise<RecentOrderRow[]> {
  try {
    const orders = await prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, status: true, userId: true, guestEmail: true, total: true, createdAt: true },
    });

    const uniqueUserIds = Array.from(
      new Set(orders.map((order) => order.userId).filter((id): id is string => Boolean(id)))
    );

    const emailByUserId = new Map<string, string | null>();
    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const { data } = await supabaseAdminClient.auth.admin.getUserById(userId);
        emailByUserId.set(userId, data.user?.email ?? null);
      })
    );

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      customerLabel:
        (order.userId ? emailByUserId.get(order.userId) : null) ?? order.guestEmail ?? "Guest",
      total: order.total,
      createdAt: order.createdAt,
    }));
  } catch (error) {
    console.error("[adminDashboardStats] Failed to load recent orders:", (error as Error).message);
    return [];
  }
}

/**
 * getRecentProducts
 * Section 3.1 #1 — last 5 products added/modified, newest edit first.
 */
export async function getRecentProducts(limit: number = 5): Promise<RecentProductRow[]> {
  try {
    return await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, name: true, status: true, updatedAt: true },
    });
  } catch (error) {
    console.error("[adminDashboardStats] Failed to load recent products:", (error as Error).message);
    return [];
  }
}

/**
 * getAdminDashboardAlerts
 * Section 3.1 #4 — only "Pending orders needing action" is wired for
 * real: this schema has no inventory/stock field on Product and no
 * promotions model, so the low-inventory and expiring-promotion
 * alerts from the spec are structurally not applicable yet rather
 * than silently faked with placeholder data.
 */
export async function getAdminDashboardAlerts(): Promise<AdminDashboardAlerts> {
  try {
    const pendingOrdersCount = await prisma.order.count({
      where: { deletedAt: null, status: "pending" },
    });
    return { pendingOrdersCount };
  } catch (error) {
    console.error("[adminDashboardStats] Failed to load alerts:", (error as Error).message);
    return { pendingOrdersCount: 0 };
  }
}
