/**
 * FILE: components/shared/IdleSessionGuard.tsx
 * ROLE: Shared — rendered once inside each signed-in account layout
 * (buyer, admin, superAdmin). Never in the root, public or auth layouts.
 *
 * PURPOSE:
 * Renders nothing. Watches for inactivity with useIdleTimeout and, when
 * the limit is reached, signs the user out the same way the manual
 * Sign Out button does, then sends them to the login page.
 *
 * DATA FLOW:
 * 1. useIdleTimeout calls handleIdle after idleMinutes of no activity.
 * 2. handleIdle POSTs /api/auth/logout — that endpoint expires the
 *    session cookies, ends admin Vault sessions and sends
 *    Clear-Site-Data (Rule 44), so idle logout and manual logout share
 *    one code path.
 * 3. The user is redirected to /auth/login?reason=idle so the login
 *    page can explain why (a toast would be lost during the redirect).
 */
"use client";

import { useRouter } from "next/navigation";
import { getCsrfHeader } from "@/lib/csrf";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

interface IdleSessionGuardProps {
  idleMinutes?: number; // buyer 30, admin and superAdmin 15
}

export default function IdleSessionGuard({ idleMinutes = 30 }: IdleSessionGuardProps) {
  const router = useRouter();

  // Ends the session server-side first (cookie expiry is the real logout
  // step, Rule 44), then navigates — even if the request failed, the
  // user still leaves the protected area.
  async function handleIdle() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: getCsrfHeader() });
    } finally {
      router.push("/auth/login?reason=idle");
    }
  }

  useIdleTimeout(handleIdle, idleMinutes);

  return null;
}
