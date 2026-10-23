/**
 * FILE: components/auth/OAuthErrorNotice.tsx
 * ROLE: Public — rendered by app/auth/login/page.tsx only (task-56c).
 *
 * PURPOSE:
 * Renders nothing. When the login page is opened with ?oauthError=<code>
 * (set by /api/auth/oauth/start or /callback after a blocked or failed
 * Google/Facebook sign-in), it shows the matching message as an error toast,
 * then removes the query param so a refresh does not show it again.
 *
 * DATA FLOW:
 * 1. useSearchParams reads "oauthError" from the URL.
 * 2. getOAuthErrorMessage(code) picks the text. An unknown or empty code gets
 *    the generic message, so a made-up value can never show arbitrary text.
 * 3. router.replace("/auth/login") drops the param without adding a history
 *    entry.
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOAuthErrorMessage } from "@/lib/errorMessages";
import type { ToastType } from "@/components/shared/useToast";

interface OAuthErrorNoticeProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function OAuthErrorNotice({ showToast }: OAuthErrorNoticeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasShownNotice = useRef(false);

  // Runs when the page loads with an error code in the URL. The ref stops
  // React StrictMode's double-run in development from showing it twice.
  useEffect(() => {
    if (!searchParams.has("oauthError") || hasShownNotice.current) return;

    hasShownNotice.current = true;
    showToast(getOAuthErrorMessage(searchParams.get("oauthError")), "error");
    router.replace("/auth/login", { scroll: false });
  }, [searchParams, showToast, router]);

  return null;
}
