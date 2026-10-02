"use client";

/**
 * FILE: components/shared/ErrorState.tsx
 * ROLE: Shared — used by app/error.tsx and app/global-error.tsx
 * (and by future per-segment error.tsx files, e.g. app/buyer/error.tsx).
 *
 * PURPOSE:
 * The friendly "something went wrong" screen (Rule 31.10 / 34.1): says
 * what happened and what to do next, offers a "Try again" button and a
 * way back to the homepage, and never shows the raw error message or a
 * stack trace. A client component because the button has a click handler.
 *
 * DATA FLOW:
 * 1. The boundary file receives `error` and `retry` from Next.js.
 * 2. It passes `retry` as onRetry and the error's digest as `digest`.
 * 3. This component renders the message; clicking "Try again" calls onRetry,
 *    which re-fetches and re-renders the failed part of the page.
 */
import Link from "next/link";
import { Home, RotateCw } from "lucide-react";
import "../../app/styles/errorPages.css";

interface ErrorStateProps {
  /** Called when the visitor clicks "Try again". */
  onRetry: () => void;
  /**
   * Next.js's short error code. It only identifies the error in the
   * server logs — it reveals nothing — so it is safe to show as a
   * support reference.
   */
  digest?: string;
  /**
   * Renders "Back to homepage" as a plain <a> (full page load) instead
   * of next/link. Used by global-error.tsx, where the whole app tree —
   * including the router — has been replaced, so client-side navigation
   * is not available.
   */
  useHardNavigation?: boolean;
}

export default function ErrorState({ onRetry, digest, useHardNavigation = false }: ErrorStateProps) {
  const homeLinkContent = (
    <>
      <Home size={18} strokeWidth={1.75} aria-hidden="true" />
      Back to homepage
    </>
  );

  return (
    <section className="errorPage" role="alert">
      <div className="errorPageInner">
        <p className="errorPageEyebrow">Error</p>
        <h1 className="errorPageTitle">Something went wrong</h1>
        <p className="errorPageMessage">
          We couldn&apos;t load this page. Try again in a moment, and if it keeps happening,
          head back to the homepage.
        </p>
        <div className="errorPageActions">
          <button type="button" className="errorPageButtonPrimary" onClick={onRetry}>
            <RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />
            Try again
          </button>
          {useHardNavigation ? (
            // Plain anchor on purpose — see useHardNavigation above.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/" className="errorPageButtonSecondary">
              {homeLinkContent}
            </a>
          ) : (
            <Link href="/" className="errorPageButtonSecondary">
              {homeLinkContent}
            </Link>
          )}
        </div>
        {digest ? <p className="errorPageReference">Reference: {digest}</p> : null}
      </div>
    </section>
  );
}
