/**
 * FILE: lib/adminAnalyticsStats.ts
 * PURPOSE:
 * Read-only aggregation queries for app/admin/analytics/page.tsx
 * (admin_account_specification.md Section 3.5 — task-65, task-92).
 * Distinct from lib/analyticsStats.ts (super-admin sitewide PAGE
 * VIEW traffic, Rule 41) — this file is commerce analytics: orders,
 * revenue, category performance, and buyer metrics, sourced from
 * `Order`/`OrderItem`/`Product` plus Supabase Auth for buyer counts
 * (no local Buyer/User table, same constraint as task-34/76/84).
 *
 * Every exported function fails soft (same contract as
 * lib/adminDashboardStats.ts) — an aggregation failure returns a
 * zeroed/empty shape rather than crashing the whole dashboard page.
 */
import { prisma } from "@/services/prisma";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

// Order statuses counted as realized revenue — same set used by
// lib/adminDashboardStats.ts's quick stats, kept in sync deliberately.
const REVENUE_STATUSES = ["PAID", "Confirmed", "Shipped", "Delivered"];
const MAX_AUTH_USERS_PAGES = 10;
const AUTH_USERS_PER_PAGE = 1000;

export interface AnalyticsTimeSeriesPoint {
  date: string; // "YYYY-MM-DD"
  orders: number;
  revenue: number;
  newBuyers: number;
}

export interface CategoryBreakdownRow {
  category: string;
  categoryLabel: string;
  revenue: number;
  orders: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface BuyerMetrics {
  totalBuyers: number;
  newBuyersLast7Days: number;
  newBuyersLast30Days: number;
  repeatBuyerRate: number; // 0-100
  averageOrderValue: number;
  lifetimeCustomerValue: number;
}

export interface AdminAnalyticsSummary {
  timeSeries: AnalyticsTimeSeriesPoint[];
  categoryBreakdown: CategoryBreakdownRow[];
  topProducts: TopProductRow[];
  buyerMetrics: BuyerMetrics;
}

const EMPTY_SUMMARY: AdminAnalyticsSummary = {
  timeSeries: [],
  categoryBreakdown: [],
  topProducts: [],
  buyerMetrics: {
    totalBuyers: 0,
    newBuyersLast7Days: 0,
    newBuyersLast30Days: 0,
    repeatBuyerRate: 0,
    averageOrderValue: 0,
    lifetimeCustomerValue: 0,
  },
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWindow(days: number): Date {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  todayUtc.setUTCDate(todayUtc.getUTCDate() - (days - 1));
  return todayUtc;
}

/**
 * resolveFilteredOrderIds
 * When a category filter is active, resolves the set of Order IDs
 * that contain at least one item from those categories (via
 * OrderItem -> Product join). Returns null when no category filter
 * is applied, meaning "don't restrict by order ID" — callers treat
 * null differently from an empty array (empty array = filter active
 * but zero matches).
 */
async function resolveFilteredOrderIds(categories: string[] | null): Promise<string[] | null> {
  if (!categories || categories.length === 0) return null;

  const rows = await prisma.orderItem.findMany({
    where: { product: { category: { in: categories } } },
    select: { orderId: true },
    distinct: ["orderId"],
  });
  return rows.map((row: { orderId: string }) => row.orderId);
}

/**
 * fetchAllBuyerCreatedDates
 * Pages through Supabase Admin API's listUsers() (same pattern as
 * app/api/admin/users/route.ts's fetchAllBuyers) and returns only
 * the created_at timestamps for role "buyer" accounts — the minimum
 * data needed for buyer-count metrics, avoiding a full user object
 * per row.
 */
async function fetchAllBuyerCreatedDates(): Promise<Date[]> {
  const createdDates: Date[] = [];

  for (let page = 1; page <= MAX_AUTH_USERS_PAGES; page++) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const role = (user.user_metadata?.role as string | undefined) ?? "buyer";
      if (role !== "buyer") continue;
      createdDates.push(new Date(user.created_at));
    }

    if (data.users.length < AUTH_USERS_PER_PAGE) break;
  }

  return createdDates;
}

/**
 * getAdminAnalyticsSummary
 * Single entry point for /admin/analytics — runs every aggregate
 * over the same `days`-length window (optionally scoped to
 * `categories`) and returns one combined shape covering Section
 * 3.5's four sections: time series, category breakdown, buyer
 * metrics. (Filters themselves are applied here; the sticky UI
 * controls just re-call this with different params.)
 */
export async function getAdminAnalyticsSummary(
  days: number = 30,
  categories: string[] | null = null
): Promise<AdminAnalyticsSummary> {
  try {
    const windowStart = startOfWindow(days);
    const filteredOrderIds = await resolveFilteredOrderIds(categories);
    const orderIdFilter = filteredOrderIds ? { id: { in: filteredOrderIds } } : {};

    const buyerCreatedDates = await fetchAllBuyerCreatedDates();

    // --- Time series: orders + revenue per day, all non-deleted
    // orders count toward "orders", only REVENUE_STATUSES count
    // toward "revenue" (mirrors adminDashboardStats' quick stats).
    const orders = await prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: windowStart }, ...orderIdFilter },
      select: { id: true, status: true, total: true, userId: true, createdAt: true },
    });

    const dayBuckets = new Map<string, { orders: number; revenue: number; newBuyers: number }>();
    for (let offset = 0; offset < days; offset++) {
      const day = new Date(windowStart);
      day.setUTCDate(day.getUTCDate() + offset);
      dayBuckets.set(toDateKey(day), { orders: 0, revenue: 0, newBuyers: 0 });
    }

    for (const order of orders) {
      const key = toDateKey(order.createdAt);
      const bucket = dayBuckets.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      if (REVENUE_STATUSES.includes(order.status)) bucket.revenue += order.total;
    }
    for (const createdAt of buyerCreatedDates) {
      if (createdAt < windowStart) continue;
      const bucket = dayBuckets.get(toDateKey(createdAt));
      if (bucket) bucket.newBuyers += 1;
    }

    const timeSeries: AnalyticsTimeSeriesPoint[] = Array.from(dayBuckets.entries()).map(
      ([date, counts]) => ({ date, ...counts })
    );

    // --- Category breakdown + top products: join OrderItem -> Product,
    // scoped to the same window/category/order-id filters.
    const items = await prisma.orderItem.findMany({
      where: {
        order: { deletedAt: null, createdAt: { gte: windowStart }, ...orderIdFilter },
        ...(categories && categories.length ? { product: { category: { in: categories } } } : {}),
      },
      select: {
        orderId: true,
        productId: true,
        nameSnapshot: true,
        priceSnapshot: true,
        quantity: true,
        product: { select: { category: true, categoryLabel: true } },
      },
    });

    const categoryMap = new Map<string, { categoryLabel: string; revenue: number; orderIds: Set<string> }>();
    const productMap = new Map<string, TopProductRow>();

    for (const item of items) {
      const lineRevenue = item.priceSnapshot * item.quantity;
      const categorySlug = item.product?.category ?? "unknown";
      const categoryLabel = item.product?.categoryLabel ?? "Unknown";

      const categoryEntry = categoryMap.get(categorySlug) ?? {
        categoryLabel,
        revenue: 0,
        orderIds: new Set<string>(),
      };
      categoryEntry.revenue += lineRevenue;
      categoryEntry.orderIds.add(item.orderId);
      categoryMap.set(categorySlug, categoryEntry);

      const productEntry = productMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.nameSnapshot,
        category: categorySlug,
        unitsSold: 0,
        revenue: 0,
      };
      productEntry.unitsSold += item.quantity;
      productEntry.revenue += lineRevenue;
      productMap.set(item.productId, productEntry);
    }

    const categoryBreakdown: CategoryBreakdownRow[] = Array.from(categoryMap.entries())
      .map(([category, entry]) => ({
        category,
        categoryLabel: entry.categoryLabel,
        revenue: entry.revenue,
        orders: entry.orderIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts: TopProductRow[] = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Buyer metrics: total/new buyer counts from Supabase Auth,
    // repeat-buyer rate + AOV + LTV from Order rows (all-time, not
    // windowed — lifetime metrics wouldn't mean much clipped to a
    // date range).
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newBuyersLast7Days = buyerCreatedDates.filter((d) => d >= since7d).length;
    const newBuyersLast30Days = buyerCreatedDates.filter((d) => d >= since30d).length;

    const allRevenueOrders = await prisma.order.findMany({
      where: { deletedAt: null, status: { in: REVENUE_STATUSES }, userId: { not: null } },
      select: { userId: true, total: true },
    });

    const spendByBuyer = new Map<string, { orderCount: number; totalSpend: number }>();
    for (const order of allRevenueOrders) {
      const userId = order.userId as string;
      const entry = spendByBuyer.get(userId) ?? { orderCount: 0, totalSpend: 0 };
      entry.orderCount += 1;
      entry.totalSpend += order.total;
      spendByBuyer.set(userId, entry);
    }

    const purchasingBuyerCount = spendByBuyer.size;
    const repeatBuyerCount = Array.from(spendByBuyer.values()).filter((v) => v.orderCount > 1).length;
    const totalOrderCount = allRevenueOrders.length;
    const totalRevenue = allRevenueOrders.reduce(
      (sum: number, o: { total: number }) => sum + o.total,
      0
    );

    const buyerMetrics: BuyerMetrics = {
      totalBuyers: buyerCreatedDates.length,
      newBuyersLast7Days,
      newBuyersLast30Days,
      repeatBuyerRate: purchasingBuyerCount > 0 ? (repeatBuyerCount / purchasingBuyerCount) * 100 : 0,
      averageOrderValue: totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0,
      lifetimeCustomerValue: purchasingBuyerCount > 0 ? totalRevenue / purchasingBuyerCount : 0,
    };

    return { timeSeries, categoryBreakdown, topProducts, buyerMetrics };
  } catch (error) {
    console.error("[adminAnalyticsStats] Failed to load analytics summary:", (error as Error).message);
    return EMPTY_SUMMARY;
  }
}
