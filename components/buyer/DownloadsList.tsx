/**
 * FILE: components/buyer/DownloadsList.tsx
 * ROLE: Buyer only — rendered inside app/buyer/downloads/page.tsx.
 *
 * PURPOSE:
 * One card per owned digital item: thumbnail, name, category,
 * purchase date, license key (with copy button) when applicable, and
 * a Download button that requests a fresh signed R2 URL on click
 * (buyer_account_specification.md Section 4.1). Handles all three
 * required data states (Rule 25): loading skeleton, empty state with
 * a CTA to /shop, and error state with retry.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Copy, Check, PackageOpen } from "lucide-react";
import { useBuyerDownloads } from "@/lib/hooks/useBuyerDownloads";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

function formatPurchaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function DownloadsList() {
  const { downloads, isLoading, error, refetch, requestDownloadUrl } = useBuyerDownloads();
  const { toasts, showToast, dismissToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Requests a fresh signed URL for this item and opens it — disables
  // just that one card's button while the request is in flight so a
  // buyer can still download a different item at the same time.
  async function handleDownload(downloadId: string) {
    setPendingId(downloadId);
    const result = await requestDownloadUrl(downloadId);
    setPendingId(null);
    if (!result.success) showToast(`✕ ${result.message}`, "error");
  }

  function handleCopyLicense(downloadId: string, licenseKey: string) {
    navigator.clipboard.writeText(licenseKey);
    setCopiedId(downloadId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="buyerDownloadsGrid">
        {[0, 1, 2].map((index) => (
          <div key={index} className="buyerDownloadCard buyerDownloadCard--skeleton">
            <div className="buyerDownloadSkeletonThumb skeletonBlock" />
            <div className="buyerDownloadSkeletonLine skeletonBlock" />
            <div className="buyerDownloadSkeletonLine skeletonBlock buyerDownloadSkeletonLine--short" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="buyerDownloadsEmptyState">
        <PackageOpen size={32} />
        <p>{error}</p>
        <button type="button" className="buyerDownloadsRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="buyerDownloadsEmptyState">
        <PackageOpen size={32} />
        <p>No downloads yet.</p>
        <Link href="/shop" className="buyerDownloadsRetryButton">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="buyerDownloadsGrid">
        {downloads.map((item) => (
          <article key={item.id} className="buyerDownloadCard">
            <div className="buyerDownloadThumbWrapper">
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed/thumbnail source, next/image not needed for this small fixed-ratio card
                <img src={item.coverImageUrl} alt={item.name} className="buyerDownloadThumb" />
              ) : (
                <div className="buyerDownloadThumbFallback" />
              )}
            </div>

            <p className="buyerDownloadCategory">{item.categoryLabel ?? "Digital product"}</p>
            <h2 className="buyerDownloadName">{item.name}</h2>
            <p className="buyerDownloadDate">Purchased {formatPurchaseDate(item.purchasedAt)}</p>

            {item.licenseKey && (
              <div className="buyerDownloadLicenseRow">
                <code className="buyerDownloadLicenseKey">{item.licenseKey}</code>
                <button
                  type="button"
                  className="buyerDownloadCopyButton"
                  onClick={() => handleCopyLicense(item.id, item.licenseKey!)}
                  aria-label="Copy license key"
                >
                  {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}

            <button
              type="button"
              className="buyerDownloadButton"
              onClick={() => handleDownload(item.id)}
              disabled={pendingId === item.id}
            >
              <Download size={16} />
              {pendingId === item.id ? "Preparing…" : "Download"}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
