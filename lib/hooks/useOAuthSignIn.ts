/**
 * FILE: lib/hooks/useOAuthSignIn.ts
 * ROLE: Auth — used by components/auth/OAuthButtons.tsx on /auth/login (task-56c).
 *
 * PURPOSE:
 * Starts a Google or Facebook sign-in. It does nothing clever: it sends the
 * browser to GET /api/auth/oauth/start?provider=<name> and the server runs
 * the whole flow (task-56b). No Supabase browser client is used and no token
 * ever reaches JavaScript or localStorage (Rule 18.4).
 *
 * DATA FLOW:
 * 1. A button calls startOAuthSignIn("google" | "facebook").
 * 2. redirectingProvider is set so the buttons can disable and show a spinner.
 * 3. window.location.assign() leaves the page for the start route.
 * 4. If the browser later restores this page from its back/forward cache, the
 *    state is reset so the buttons are usable again.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type OAuthProviderName = "google" | "facebook";

export function useOAuthSignIn() {
  // Which provider the visitor clicked; null while no sign-in has started.
  const [redirectingProvider, setRedirectingProvider] = useState<OAuthProviderName | null>(null);

  // Runs once on mount. A visitor who presses Back from the provider's page
  // can get this page restored exactly as they left it (buttons still
  // disabled) — pageshow with persisted=true is how that case is detected.
  useEffect(() => {
    function resetWhenRestored(event: PageTransitionEvent) {
      if (event.persisted) setRedirectingProvider(null);
    }

    window.addEventListener("pageshow", resetWhenRestored);
    return () => window.removeEventListener("pageshow", resetWhenRestored);
  }, []);

  /**
   * startOAuthSignIn
   * Ignores a second click while a redirect is already under way, then
   * navigates to the server start route for the chosen provider.
   */
  const startOAuthSignIn = useCallback(
    (provider: OAuthProviderName) => {
      if (redirectingProvider) return;

      setRedirectingProvider(provider);

      // A full-page navigation is required here: the start route is an API
      // route that sets cookies and redirects to another site, so Next's
      // client-side router must not handle it. The absolute address also
      // keeps Next's lint rule (which expects page routes) from flagging it.
      const startUrl = new URL("/api/auth/oauth/start", window.location.origin);
      startUrl.searchParams.set("provider", provider);
      window.location.assign(startUrl.toString());
    },
    [redirectingProvider]
  );

  return { redirectingProvider, startOAuthSignIn };
}
