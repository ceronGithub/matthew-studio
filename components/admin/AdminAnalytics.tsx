/**
 * FILE: components/admin/AdminAnalytics.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/analytics/page.tsx.
 * Server-side, GET /api/admin/analytics (task-92) already 403s any
 * account without the "view-analytics" permission (Section 3.5's
 * "Availability" gate) — this component just renders that outcome.
 *
 * PURPOSE:
 * Admin Analytics Dashboard (task-93, admin_account_specification.md
 * Section 3.5): time-series charts (orders/revenue/new buyers,
 * switchable line/bar), category breakdown (revenue pie + orders
 * bar + top-10 products), buyer metrics cards, and the sticky date
 * range + category filters. No charting library is added — the
 * project already renders its bar/ranked-list charts in plain CSS
 * (app/styles/analytics.css, task-91); the pie chart here uses the
 * same plain-CSS approach via a conic-gradient.
 * Handles all three required data states (Rule 25): loading
 * skeleton, empty state, and error state with retry.
 */
"use client";

import { useState } from "react";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { useAdminAnalytics, CATEGORY_OPTIONS, type DatePreset } from "@/lib/hooks/useAdminAnalytics";

type ChartType = "line" | "bar";
type TimeSeriesMetric = "orders" | "revenue" | "newBuyers";

const METRIC_LABELS: Record<TimeSeriesMetric, string> = {
  orders: "Orders",
  revenue: "Revenue",
  newBuyers: "New buyers",
};

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  custom: "Custom",
};

// Fixed palette for the category pie chart — stable across re-renders
// so a given category always gets the same slice color.
const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * TimeSeriesChart
 * Renders the active metric (orders/revenue/newBuyers) as either a
 * line (SVG polyline) or a bar chart (same plain-CSS bar pattern as
 * task-91's visits-over-time chart), switchable per Section 3.5.1's
 * "Switchable chart type (line/bar)".
 */
function TimeSeriesChart({
  points,
  metric,
  chartType,
}: {
  points: { date: string; value: number }[];
  metric: TimeSeriesMetric;
  chartType: ChartType;
}) {
  if (points.every((p) => p.value === 0)) {
    return <p className="analyticsEmptyState">No {METRIC_LABELS[metric].toLowerCase()} recorded in this window yet.</p>;
  }

  const maxValue = Math.max(...points.map((p) => p.value), 1);

  if (chartType === "bar") {
    return (
      <>
        <div className="analyticsChart" role="img" aria-label={`${METRIC_LABELS[metric]} over time`}>
          {points.map((p) => (
            <div key={p.date} className="analyticsChartBarWrapper" title={`${p.date}: ${p.value}`}>
              <div className="analyticsChartBar" style={{ height: `${Math.max((p.value / maxValue) * 100, 2)}%` }} />
            </div>
          ))}
        </div>
        <div className="analyticsChartFooter">
          <span>{points[0]?.date}</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </>
    );
  }

  // Line chart — plain SVG polyline, no library, scaled to a 0-100 viewBox.
  const coords = points
    .map((p, i) => `${(i / Math.max(points.length - 1, 1)) * 100},${100 - (p.value / maxValue) * 100}`)
    .join(" ");

  return (
    <>
      <svg
        className="adminAnalyticsLineChart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${METRIC_LABELS[metric]} over time`}
      >
        <polyline points={coords} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="analyticsChartFooter">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </>
  );
}

/**
 * CategoryPieChart
 * Plain-CSS pie chart (conic-gradient) for revenue-by-category
 * (Section 3.5.2). No canvas/SVG library needed for a static pie.
 */
function CategoryPieChart({ rows }: { rows: { categoryLabel: string; revenue: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  if (total === 0) {
    return <p className="analyticsEmptyState">No revenue recorded in this window yet.</p>;
  }

  let cursor = 0;
  const segments = rows.map((row, i) => {
    const start = cursor;
    const share = (row.revenue / total) * 100;
    cursor += share;
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="adminAnalyticsPieRow">
      <div
        className="adminAnalyticsPie"
        role="img"
        aria-label="Revenue share by category"
        style={{ background: `conic-gradient(${segments.join(", ")})` }}
      />
      <ul className="adminAnalyticsPieLegend">
        {rows.map((row, i) => (
          <li key={row.categoryLabel} className="adminAnalyticsPieLegendRow">
            <span className="adminAnalyticsPieSwatch" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="adminAnalyticsPieLegendLabel">{row.categoryLabel}</span>
            <span className="adminAnalyticsPieLegendValue">{formatPeso(row.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminAnalytics() {
  const { summary, isLoading, error, isForbidden, filters, updateFilters, toggleCategory, refetch } = useAdminAnalytics();
  const [metric, setMetric] = useState<TimeSeriesMetric>("revenue");
  const [chartType, setChartType] = useState<ChartType>("line");

  if (isForbidden) {
    return (
      <div className="analyticsPanel">
        <p className="analyticsEmptyState">
          You don&rsquo;t have permission to view analytics. Ask a super-admin to grant the &ldquo;view-analytics&rdquo;
          permission on your account.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analyticsPanel">
        <p className="analyticsEmptyState">{error}</p>
        <button className="adminAnalyticsRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* --- Sticky filters (Section 3.5.4) --- */}
      <div className="adminAnalyticsFilters">
        <div className="adminAnalyticsPresetGroup" role="group" aria-label="Date range">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`adminAnalyticsPresetButton${filters.preset === preset ? " adminAnalyticsPresetButtonActive" : ""}`}
              onClick={() => updateFilters({ preset })}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
          {filters.preset === "custom" && (
            <input
              type="number"
              className="adminAnalyticsCustomDaysInput"
              min={1}
              max={365}
              value={filters.customDays}
              onChange={(e) => updateFilters({ customDays: Math.min(Math.max(Number(e.target.value) || 1, 1), 365) })}
              aria-label="Custom number of days"
            />
          )}
        </div>

        <div className="adminAnalyticsCategoryGroup" role="group" aria-label="Category filter">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`adminAnalyticsCategoryChip${
                filters.categories.includes(option.value) ? " adminAnalyticsCategoryChipActive" : ""
              }`}
              onClick={() => toggleCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="adminAnalyticsSkeletonGrid" aria-label="Loading analytics">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeletonBlock adminAnalyticsSkeletonBlock" />
          ))}
        </div>
      ) : (
        <>
          {/* --- Buyer metrics cards (Section 3.5.3) --- */}
          <div className="adminAnalyticsMetricsGrid">
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{summary.buyerMetrics.totalBuyers.toLocaleString()}</span>
              <span className="adminAnalyticsMetricLabel">Total buyers</span>
            </div>
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{summary.buyerMetrics.newBuyersLast7Days.toLocaleString()}</span>
              <span className="adminAnalyticsMetricLabel">New buyers (7d)</span>
            </div>
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{summary.buyerMetrics.newBuyersLast30Days.toLocaleString()}</span>
              <span className="adminAnalyticsMetricLabel">New buyers (30d)</span>
            </div>
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{summary.buyerMetrics.repeatBuyerRate.toFixed(1)}%</span>
              <span className="adminAnalyticsMetricLabel">Repeat buyer rate</span>
            </div>
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{formatPeso(summary.buyerMetrics.averageOrderValue)}</span>
              <span className="adminAnalyticsMetricLabel">Average order value</span>
            </div>
            <div className="adminAnalyticsMetricCard">
              <span className="adminAnalyticsMetricValue">{formatPeso(summary.buyerMetrics.lifetimeCustomerValue)}</span>
              <span className="adminAnalyticsMetricLabel">Lifetime customer value</span>
            </div>
          </div>

          {/* --- Time series (Section 3.5.1) --- */}
          <section aria-label="Time series" className="analyticsPanel">
            <div className="adminAnalyticsPanelToolbar">
              <h2 className="analyticsPanelTitle">Over time</h2>
              <div className="adminAnalyticsPanelControls">
                <select
                  className="adminAnalyticsMetricSelect"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as TimeSeriesMetric)}
                  aria-label="Select metric"
                >
                  {(Object.keys(METRIC_LABELS) as TimeSeriesMetric[]).map((m) => (
                    <option key={m} value={m}>
                      {METRIC_LABELS[m]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="adminAnalyticsChartTypeButton"
                  onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
                  aria-label={`Switch to ${chartType === "line" ? "bar" : "line"} chart`}
                  title={`Switch to ${chartType === "line" ? "bar" : "line"} chart`}
                >
                  {chartType === "line" ? <BarChart3 size={16} /> : <LineChartIcon size={16} />}
                </button>
              </div>
            </div>
            <TimeSeriesChart
              points={summary.timeSeries.map((p) => ({ date: p.date, value: p[metric] }))}
              metric={metric}
              chartType={chartType}
            />
          </section>

          {/* --- Category breakdown (Section 3.5.2) --- */}
          <div className="analyticsBreakdownGrid">
            <section aria-label="Revenue by category" className="analyticsPanel">
              <h2 className="analyticsPanelTitle">Revenue by category</h2>
              <CategoryPieChart rows={summary.categoryBreakdown} />
            </section>

            <section aria-label="Orders by category" className="analyticsPanel">
              <h2 className="analyticsPanelTitle">Orders by category</h2>
              {summary.categoryBreakdown.every((row) => row.orders === 0) ? (
                <p className="analyticsEmptyState">No orders recorded in this window yet.</p>
              ) : (
                <ul className="analyticsRankedList">
                  {summary.categoryBreakdown.map((row) => {
                    const maxOrders = Math.max(...summary.categoryBreakdown.map((r) => r.orders), 1);
                    return (
                      <li key={row.category} className="analyticsRankedRow">
                        <span className="analyticsRankedLabel">{row.categoryLabel}</span>
                        <span className="analyticsRankedBarTrack">
                          <span
                            className="analyticsRankedBarFill"
                            style={{ width: `${Math.max((row.orders / maxOrders) * 100, 4)}%` }}
                          />
                        </span>
                        <span className="analyticsRankedValue">{row.orders}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-label="Top products" className="analyticsPanel">
              <h2 className="analyticsPanelTitle">Top 10 products</h2>
              {summary.topProducts.length === 0 ? (
                <p className="analyticsEmptyState">No product sales recorded in this window yet.</p>
              ) : (
                <ul className="analyticsRankedList">
                  {summary.topProducts.slice(0, 10).map((product) => {
                    const maxUnits = Math.max(...summary.topProducts.map((p) => p.unitsSold), 1);
                    return (
                      <li key={product.productId} className="analyticsRankedRow">
                        <span className="analyticsRankedLabel" title={product.name}>
                          {product.name}
                        </span>
                        <span className="analyticsRankedBarTrack">
                          <span
                            className="analyticsRankedBarFill"
                            style={{ width: `${Math.max((product.unitsSold / maxUnits) * 100, 4)}%` }}
                          />
                        </span>
                        <span className="analyticsRankedValue">{product.unitsSold}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
