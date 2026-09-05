/**
 * FILE: components/buyer/SubscriptionDetail.tsx
 * ROLE: Buyer only — rendered inside app/buyer/subscription/page.tsx.
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.4. Shows the buyer's
 * current plan/status/next billing date, a link to /pricing for
 * upgrade/downgrade, a Cancel action behind the shared
 * ConfirmationModal (Rule 34.4), and billing history with download
 * links. Handles all three required data states (Rule 25): loading
 * skeleton, empty state (no subscription at all — not an error), and
 * error state with retry.
 *
 * Upgrade/Downgrade note: per the spec, full plan-change logic is a
 * follow-up phase — this only links to /pricing. /pricing does not
 * yet read a highlight query param, so the link is plain for now;
 * wiring that up is out of scope for this task.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, FileText, Download } from "lucide-react";
import { useBuyerSubscription } from "@/lib/hooks/useBuyerSubscription";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  past_due: "Past Due",
  cancelled: "Cancelled",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SubscriptionDetail() {
  const { subscription, invoices, isLoading, error, refetch, cancelSubscription } = useBuyerSubscription();
  const { toasts, showToast, dismissToast } = useToast();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  async function handleCancelConfirm() {
    const result = await cancelSubscription();
    setIsCancelModalOpen(false);
    showToast(result.success ? `✓ ${result.message}` : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {isLoading && (
        <div className="subscriptionCard subscriptionCard--skeleton">
          <div className="subscriptionSkeletonLine skeletonBlock" />
          <div className="subscriptionSkeletonLine skeletonBlock" />
          <div className="subscriptionSkeletonLine skeletonBlock" />
        </div>
      )}

      {!isLoading && error && (
        <div className="subscriptionEmptyState">
          <RefreshCw size={32} />
          <p>{error}</p>
          <button type="button" className="subscriptionRetryButton" onClick={refetch}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && !subscription && (
        <div className="subscriptionEmptyState">
          <RefreshCw size={32} />
          <p>You don&apos;t have an active subscription yet.</p>
          <Link href="/pricing" className="subscriptionRetryButton">
            See plans on /pricing
          </Link>
        </div>
      )}

      {!isLoading && !error && subscription && (
        <>
          <div className="subscriptionCard">
            <div className="subscriptionCardHeader">
              <div>
                <p className="subscriptionPlanName">{subscription.planName}</p>
                <p className="subscriptionPlanPrice">
                  {formatCurrency(subscription.priceAmount)} / {subscription.billingCycle}
                </p>
              </div>
              <span
                className={`subscriptionStatusBadge subscriptionStatusBadge--${subscription.status}`}
              >
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>

            <p className="subscriptionNextBilling">
              {subscription.cancelAtPeriodEnd
                ? `Cancels on ${formatDate(subscription.currentPeriodEnd)} — you'll keep access until then.`
                : `Next billing date: ${formatDate(subscription.currentPeriodEnd)}`}
            </p>

            <div className="subscriptionActions">
              <Link href="/pricing" className="subscriptionUpgradeButton">
                Upgrade / Downgrade
              </Link>
              {!subscription.cancelAtPeriodEnd && (
                <button
                  type="button"
                  className="subscriptionCancelButton"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </div>

          <div className="subscriptionBillingHistory">
            <h2 className="subscriptionBillingHistoryTitle">Billing history</h2>

            {invoices.length === 0 ? (
              <p className="subscriptionBillingHistoryEmpty">No invoices yet.</p>
            ) : (
              <ul className="subscriptionInvoiceList">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="subscriptionInvoiceRow">
                    <FileText size={16} />
                    <span className="subscriptionInvoiceDate">{formatDate(invoice.issuedAt)}</span>
                    <span className="subscriptionInvoiceAmount">{formatCurrency(invoice.amount)}</span>
                    <span className={`subscriptionInvoiceStatus subscriptionInvoiceStatus--${invoice.status}`}>
                      {invoice.status}
                    </span>
                    {invoice.pdfUrl ? (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="subscriptionInvoiceDownload"
                        aria-label="Download invoice"
                      >
                        <Download size={16} />
                      </a>
                    ) : (
                      <span className="subscriptionInvoiceDownloadUnavailable">—</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        title="Cancel subscription?"
        description={`Are you sure you want to cancel ${subscription?.planName ?? "your subscription"}? You'll keep access until the end of your current billing period — this cannot be undone.`}
        confirmLabel="Cancel subscription"
        onConfirm={handleCancelConfirm}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </>
  );
}
