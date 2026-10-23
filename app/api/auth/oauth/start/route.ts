/**
 * FILE: app/api/auth/oauth/start/route.ts
 * ROLE: Public (buyers only, enforced later in the callback) — task-56b.
 *
 * PURPOSE:
 * Starts a Google or Facebook sign-in. The login page's buttons (task-56c)
 * simply send the browser to GET /api/auth/oauth/start?provider=google. This
 * route asks Supabase for the provider's sign-in address, saves the PKCE
 * verifier in a short HttpOnly cookie, and redirects the browser there.
 * Doing it on the server keeps Supabase tokens out of browser JavaScript.
 *
 * DATA FLOW:
 * 1. Validate ?provider= against the Google/Facebook allow-list.
 * 2. Rate limit by IP (20 starts per 15 minutes).
 * 3. Supabase builds the provider address; the verifier is captured.
 * 4. Verifier + provider go into two HttpOnly cookies scoped to /api/auth/oauth.
 * 5. Redirect to the provider. It sends the user back to the callback route.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { getSiteUrl } from "@/lib/siteUrl";
import type { OAuthErrorCode } from "@/lib/oauthAccountPolicy";
import {
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_COOKIE_PATH,
  OAUTH_PKCE_COOKIE,
  OAUTH_PROVIDER_COOKIE,
  createOAuthClient,
  isSupportedOAuthProvider,
  serializeSnapshot,
} from "@/lib/oauthPkce";

const isProduction = process.env.NODE_ENV === "production";
const OAUTH_START_MAX_ATTEMPTS = 20;
const OAUTH_START_WINDOW_MINUTES = 15;

/** Sends the visitor back to the login page with a short error code. */
function redirectToLogin(errorCode: OAuthErrorCode): NextResponse {
  const loginUrl = new URL("/auth/login", getSiteUrl());
  loginUrl.searchParams.set("oauthError", errorCode);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  try {
    const provider = new URL(request.url).searchParams.get("provider");

    // Only Google and Facebook are allowed — anything else is turned away.
    if (!isSupportedOAuthProvider(provider)) {
      return redirectToLogin("generic");
    }

    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "oauth-start", OAUTH_START_MAX_ATTEMPTS, OAUTH_START_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        request,
        details: "Rate limit hit on /api/auth/oauth/start",
      });
      return redirectToLogin("rate_limited");
    }

    // Ask Supabase for the provider's sign-in address without redirecting,
    // so this route can save the verifier before sending the browser away.
    const { client, getSnapshot } = createOAuthClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getSiteUrl()}/api/auth/oauth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      console.error("[oauth/start] Could not build the provider address:", error?.message);
      return redirectToLogin("generic");
    }

    const response = NextResponse.redirect(data.url);

    // SameSite "lax" on purpose (the rest of the app uses "strict"): the
    // provider sends the user back to the callback from another site, and a
    // strict cookie would not be sent on that return trip.
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: OAUTH_COOKIE_PATH,
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    };
    response.cookies.set(OAUTH_PKCE_COOKIE, serializeSnapshot(getSnapshot()), cookieOptions);
    response.cookies.set(OAUTH_PROVIDER_COOKIE, provider, cookieOptions);

    return response;
  } catch (error) {
    // Never show raw errors to the visitor — log for the developer, send a generic message.
    console.error("[oauth/start] Unexpected error:", (error as Error).message);
    return redirectToLogin("generic");
  }
}
