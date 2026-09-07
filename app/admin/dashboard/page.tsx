/**
 * FILE: app/admin/dashboard/page.tsx
 * ROLE: Admin only — protected by app/admin/layout.tsx's middleware
 * guard (role must be "admin" or "superAdmin").
 *
 * PURPOSE:
 * Real dashboard home (admin_account_specification.md Section 3.1) —
 * replaces the earlier "coming soon" placeholder. Renders:
 *   - Quick Stats: total products, orders (7d), revenue (7d),
 *     pending orders, average order value
 *   - Alerts: pending orders needing action (only alert wired for
 *     real — low-inventory/expiring-promotion alerts are skipped
 *     since this schema has no inventory or promotions model yet)
 *   - Recent Activity: last 10 orders + last 5 products
 *   - Quick Actions: links to the areas that are actually live today
 *     (Product management, Support tickets, Vault) plus the ones
 *     still unbuilt, so this list stays honest about real scope
 * Data fetching happens directly in this Server Component (Rule
 * 31.1/31.2) — no client-side fetch, no API route needed for
 * read-only dashboard data.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Clock,
  Receipt,
  AlertTriangle,
  PlusCircle,
  ListOrdered,
  Users,
  BarChart3,
  Ticket,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { getAdminQuickStats, getRecentOrders, getRecentProducts, getAdminDashboardAlerts } from "@/lib/adminDashboardStats";
import "../../styles/adminDashboard.css";

export const metadata: Metadata = {
  title: "Admin dashboard | Matthew Studio",
  description: "Matthew Studio admin area.",
};

const QUICK_ACTIONS = [
  { href: "/admin/products/create", label: "Add New Product", description: "Create a new catalog listing", icon: PlusCircle, live: true },
  { href: "/admin/products", label: "Manage Orders", description: "Product management is live; order management is planned", icon: ListOrdered, live: true },
  { href: "/admin/support", label: "Support Tickets", description: "Reply to open buyer tickets", icon: Ticket, live: true },
  { href: "/admin/vault", label: "Security Vault", description: "Session slug and emergency backup credentials", icon: KeyRound, live: true },
  { href: "#", label: "Manage Users", description: "Not built yet", icon: Users, live: false },
  { href: "#", label: "View Analytics", description: "Not built yet", icon: BarChart3, live: false },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

function statusBadgeModifier(status: string): string {
  return status.toLowerCase();
}

export default async function AdminDashboardPage() {
  // All four queries fail soft (zeros/empty arrays) — a stats outage
  // should never take down the dashboard shell or deny access.
  const [quickStats, recentOrders, recentProducts, alerts] = await Promise.all([
    getAdminQuickStats(),
    getRecentOrders(10),
    getRecentProducts(5),
    getAdminDashboardAlerts(),
  ]);

  return (
    <section className="adminDashboardHome">
      <div className="adminDashboardHeader">
        <span className="adminDashboardEyebrow">Admin dashboard</span>
        <h1 className="adminDashboardTitle">Overview</h1>
      </div>

      {/* Quick Stats — Section 3.1 #2 */}
      <section aria-label="Quick stats">
        <div className="adminDashboardStatGrid">
          <article className="adminDashboardStatCard">
            <Package size={18} className="adminDashboardStatIcon" />
            <span className="adminDashboardStatValue">{quickStats.totalProducts}</span>
            <span className="adminDashboardStatLabel">Total products</span>
          </article>
          <article className="adminDashboardStatCard">
            <ShoppingCart size={18} className="adminDashboardStatIcon" />
            <span className="adminDashboardStatValue">{quickStats.ordersLast7Days}</span>
            <span className="adminDashboardStatLabel">Orders (last 7 days)</span>
          </article>
          <article className="adminDashboardStatCard">
            <DollarSign size={18} className="adminDashboardStatIcon" />
            <span className="adminDashboardStatValue">{formatCurrency(quickStats.revenueLast7Days)}</span>
            <span className="adminDashboardStatLabel">Revenue (last 7 days)</span>
          </article>
          <article className="adminDashboardStatCard adminDashboardStatCardWarning">
            <Clock size={18} className="adminDashboardStatIcon" />
            <span className="adminDashboardStatValue">{quickStats.pendingOrders}</span>
            <span className="adminDashboardStatLabel">Pending orders</span>
          </article>
          <article className="adminDashboardStatCard">
            <Receipt size={18} className="adminDashboardStatIcon" />
            <span className="adminDashboardStatValue">{formatCurrency(quickStats.averageOrderValue)}</span>
            <span className="adminDashboardStatLabel">Average order value</span>
          </article>
        </div>
      </section>

      {/* Alerts — Section 3.1 #4 */}
      {alerts.pendingOrdersCount > 0 && (
        <section aria-label="Alerts" className="adminDashboardAlertsPanel">
          <h2 className="adminDashboardPanelTitle">Alerts</h2>
          <div className="adminDashboardAlertItem">
            <AlertTriangle size={16} className="adminDashboardAlertIcon" />
            <span>
              {alerts.pendingOrdersCount} pending order{alerts.pendingOrdersCount === 1 ? "" : "s"} needing action
            </span>
          </div>
        </section>
      )}

      <div className="adminDashboardGrid">
        {/* Recent Activity: orders — Section 3.1 #1 */}
        <section aria-label="Recent orders" className="adminDashboardPanel">
          <h2 className="adminDashboardPanelTitle">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="adminDashboardEmptyState">No orders yet.</p>
          ) : (
            <ul className="adminDashboardRecordList">
              {recentOrders.map((order) => (
                <li key={order.id} className="adminDashboardRecordItem">
                  <div className="adminDashboardRecordMain">
                    <span className="adminDashboardRecordPrimary">{order.customerLabel}</span>
                    <span className="adminDashboardRecordMeta">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <span className={`adminDashboardStatusBadge adminDashboardStatusBadge--${statusBadgeModifier(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="adminDashboardRecordAmount">{formatCurrency(order.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Activity: products — Section 3.1 #1 */}
        <section aria-label="Recently modified products" className="adminDashboardPanel">
          <h2 className="adminDashboardPanelTitle">Recently Modified Products</h2>
          {recentProducts.length === 0 ? (
            <p className="adminDashboardEmptyState">No products yet.</p>
          ) : (
            <ul className="adminDashboardRecordList">
              {recentProducts.map((product) => (
                <li key={product.id} className="adminDashboardRecordItem">
                  <div className="adminDashboardRecordMain">
                    <span className="adminDashboardRecordPrimary">{product.name}</span>
                    <span className="adminDashboardRecordMeta">{new Date(product.updatedAt).toLocaleString()}</span>
                  </div>
                  <span className={`adminDashboardStatusBadge adminDashboardStatusBadge--${statusBadgeModifier(product.status)}`}>
                    {product.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick Actions — Section 3.1 #3 */}
        <section aria-label="Quick actions" className="adminDashboardPanel">
          <h2 className="adminDashboardPanelTitle">Quick Actions</h2>
          <ul className="adminDashboardQuickActionList">
            {QUICK_ACTIONS.map(({ href, label, description, icon: Icon, live }) => (
              <li key={label}>
                <Link href={live ? href : "#"} className="adminDashboardQuickActionLink" aria-disabled={!live}>
                  <Icon size={18} className="adminDashboardQuickActionIcon" />
                  <span className="adminDashboardQuickActionText">
                    <span className="adminDashboardQuickActionLabel">{label}</span>
                    <span className="adminDashboardQuickActionDescription">{description}</span>
                  </span>
                  {live && <ArrowRight size={16} className="adminDashboardQuickActionArrow" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
