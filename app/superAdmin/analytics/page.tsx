/**
 * FILE: app/superAdmin/analytics/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role must be "superAdmin").
 *
 * PURPOSE:
 * Completes task-91 — the last of the 3 micro-tasks task-53 was split
 * into (task-89 schema -> task-90 beacon/write path -> task-91, this
 * file). Reads exclusively from `PageViewDaily` via
 * lib/analyticsStats.ts's getAnalyticsSummary() — no other table, no
 * IP/session/visitor identifier ever touches this page, per Rule 41.
 * Stays a Server Component per Rule 31.1: this is read-only aggregate
 * data with no interactivity, so no client component is needed at
 * all (same reasoning as app/superAdmin/dashboard/page.tsx's health
 * widget).
 */
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { getAnalyticsSummary, type LabeledTotal } from "@/lib/analyticsStats";
import "../../styles/analytics.css";

export const metadata: Metadata = {
  title: "Analytics | Matthew Studio Admin",
  description: "Site traffic: visits over time, top pages, referrers, devices, and countries.",
};

const WINDOW_DAYS = 30;

/**
 * RankedList
 * Renders a labeled-total array as a bar-and-value list, each bar's
 * width scaled against the list's own highest value. Shared across
 * the top-pages, top-referrers, and top-countries panels so the three
 * panels can never drift out of visual sync with each other.
 */
function RankedList({ items, emptyMessage }: { items: LabeledTotal[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <p className="analyticsEmptyState">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...items.map((item) => item.totalViews), 1);

  return (
    <ul className="analyticsRankedList">
      {items.map((item) => (
        <li key={item.label} className="analyticsRankedRow">
          <span className="analyticsRankedLabel" title={item.label}>
            {item.label}
          </span>
          <span className="analyticsRankedBarTrack">
            <span
              className="analyticsRankedBarFill"
              style={{ width: `${Math.max((item.totalViews / maxValue) * 100, 4)}%` }}
            />
          </span>
          <span className="analyticsRankedValue">{item.totalViews}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function SuperAdminAnalyticsPage() {
  const summary = await getAnalyticsSummary(WINDOW_DAYS);
  const maxDailyViews = Math.max(...summary.visitsOverTime.map((point) => point.totalViews), 1);

  return (
    <section className="analyticsPage">
      <div className="analyticsPageHeader">
        <p className="analyticsPageEyebrow">Super-Admin</p>
        <h1 className="analyticsPageTitle">Analytics</h1>
        <p className="analyticsPageSubtitle">
          Anonymized, aggregate-only traffic (Rule 41) — visits over the last {WINDOW_DAYS} days, top pages,
          referrers, device mix, and country-level reach. No IP address, session, or visitor identifier is ever
          stored behind these numbers.
        </p>
      </div>

      <div className="analyticsTotalCard">
        <span className="analyticsTotalValue">{summary.totalViews.toLocaleString()}</span>
        <span className="analyticsTotalLabel">Total page views (last {WINDOW_DAYS} days)</span>
      </div>

      <section aria-label="Visits over time" className="analyticsPanel">
        <h2 className="analyticsPanelTitle">Visits over time</h2>
        {summary.visitsOverTime.every((point) => point.totalViews === 0) ? (
          <p className="analyticsEmptyState">No page views recorded in this window yet.</p>
        ) : (
          <>
            <div className="analyticsChart" role="img" aria-label={`Daily page views over the last ${WINDOW_DAYS} days`}>
              {summary.visitsOverTime.map((point) => (
                <div key={point.date} className="analyticsChartBarWrapper" title={`${point.date}: ${point.totalViews}`}>
                  <div
                    className="analyticsChartBar"
                    style={{ height: `${Math.max((point.totalViews / maxDailyViews) * 100, 2)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="analyticsChartFooter">
              <span>{summary.visitsOverTime[0]?.date}</span>
              <span>{summary.visitsOverTime[summary.visitsOverTime.length - 1]?.date}</span>
            </div>
          </>
        )}
      </section>

      <div className="analyticsBreakdownGrid">
        <section aria-label="Top pages" className="analyticsPanel">
          <h2 className="analyticsPanelTitle">Top pages</h2>
          <RankedList items={summary.topPages} emptyMessage="No page views recorded in this window yet." />
        </section>

        <section aria-label="Top referrers" className="analyticsPanel">
          <h2 className="analyticsPanelTitle">Top referrers</h2>
          <RankedList items={summary.topReferrers} emptyMessage="No referrer data recorded in this window yet." />
        </section>

        <section aria-label="Device breakdown" className="analyticsPanel">
          <h2 className="analyticsPanelTitle">Device breakdown</h2>
          <RankedList items={summary.deviceBreakdown} emptyMessage="No device data recorded in this window yet." />
        </section>

        <section aria-label="Top countries" className="analyticsPanel">
          <h2 className="analyticsPanelTitle">Top countries</h2>
          <RankedList items={summary.topCountries} emptyMessage="No country data recorded in this window yet." />
        </section>
      </div>

      {summary.totalViews === 0 && (
        <section aria-label="No data yet" className="analyticsPanel">
          <BarChart3 size={24} />
          <p className="analyticsEmptyState">
            Traffic will appear here once visitors start browsing the public site — the beacon (task-90) is already
            live in app/(public)/layout.tsx.
          </p>
        </section>
      )}
    </section>
  );
}
