"use client";

/**
 * FILE: app/error.tsx
 * ROLE: Public — root-level error boundary (Rule 31.10). Catches any
 * unhandled render error in a page that has no closer error.tsx.
 *
 * PURPOSE:
 * Shows the friendly error screen instead of a blank page or a stack
 * trace. Renders inside the root layout, so the site's fonts and theme
 * still apply. Errors thrown in the root layout itself are caught by
 * app/global-error.tsx instead — this file cannot catch those.
 *
 * DATA FLOW:
 * 1. Next.js catches the error and renders this component with `error` and `retry`.
 * 2. The effect logs the error so it can be matched to the server logs.
 * 3. "Try again" calls retry(), which re-fetches and re-renders the failed page.
 */
import { useEffect } from "react";
import ErrorState from "@/components/shared/ErrorState";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Production log, kept on purpose: the digest ties this browser-side error
    // to the matching entry in the server logs, which is how we investigate
    // errors customers report.
    console.error("[error boundary]", error);
  }, [error]);

  return <ErrorState onRetry={retry} digest={error.digest} />;
}
