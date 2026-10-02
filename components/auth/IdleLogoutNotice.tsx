/**
 * FILE: components/auth/IdleLogoutNotice.tsx
 * ROLE: Public — rendered by app/auth/login/page.tsx only.
 *
 * PURPOSE:
 * Renders nothing. When the login page is opened with ?reason=idle (set by
 * IdleSessionGuard after an inactivity logout), it shows a warning toast
 * explaining why the user was signed out, then removes the query param so
 * a refresh or a later visit does not show the toast again.
 *
 * DATA FLOW:
 * 1. useSearchParams reads "reason" from the URL.
 * 2. reason === "idle" → showToast(sessionMessages.idleLogout, "warning").
 * 3. router.replace("/auth/login") drops the param without adding a
 *    history entry.
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionMessages } from "@/lib/errorMessages";
import type { ToastType } from "@/components/shared/useToast";

interface IdleLogoutNoticeProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function IdleLogoutNotice({ showToast }: IdleLogoutNoticeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasShownNotice = useRef(false);

  // Runs when the page loads with a reason in the URL. The ref stops React
  // StrictMode's double-run in development from showing the toast twice.
  useEffect(() => {
    if (searchParams.get("reason") !== "idle" || hasShownNotice.current) return;

    hasShownNotice.current = true;
    showToast(sessionMessages.idleLogout, "warning");
    router.replace("/auth/login", { scroll: false });
  }, [searchParams, showToast, router]);

  return null;
}
