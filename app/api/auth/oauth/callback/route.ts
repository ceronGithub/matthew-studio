/**
 * FILE: app/api/auth/oauth/callback/route.ts
 * ROLE: Public entry, buyers only — task-56b.
 *
 * PURPOSE:
 * Finishes a Google or Facebook sign-in. The provider sends the user back
 * here with a one-time code. This route trades the code for a Supabase
 * session, asks lib/oauthAccountPolicy.ts what the sign-in may do, and then
 * either signs the buyer in (same HttpOnly cookies as the password login) or
 * turns it away with a message on /auth/login.
 *
 * Rules decided 2026-10-24: buyers only; an email that already has a
 * password account is blocked, never linked. Supabase links identities with
 * the same verified email on its own, so a blocked sign-in also removes the
 * identity that was just attached (needs "Enable Manual Linking" in the
 * Supabase dashboard).
 *
 * DATA FLOW:
 * 1. Rate limit by IP, then read the code plus the PKCE and provider cookies.
 * 2. Exchange the code for a session; read the user's sign-in methods.
 * 3. decideOAuthOutcome() picks allow or block.
 * 4. Block: remove the fresh identity, end this one session only, log, redirect.
 * 5. Allow: a new buyer gets role "buyer" set server-side; log login_success;
 *    run anomaly detection; set session cookies; send them to their dashboard.
 *
 * The success answer is a tiny HTML page that moves on by itself instead of
 * an HTTP redirect: the session cookies are SameSite=Strict, and a redirect
 * that began on the provider's site would not carry them to the dashboard.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient, UserIdentity } from "@supabase/supabase-js";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { setSessionCookies } from "@/lib/loginSession";
import { getDashboardPathForRole } from "@/lib/roleRouting";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  decideOAuthOutcome,
  getOAuthErrorCode,
  isBlockedOutcome,
  type OAuthErrorCode,
} from "@/lib/oauthAccountPolicy";
import {
  OAUTH_COOKIE_PATH,
  OAUTH_PKCE_COOKIE,
  OAUTH_PROVIDER_COOKIE,
  createOAuthClient,
  isSupportedOAuthProvider,
  parseSnapshot,
} from "@/lib/oauthPkce";

const OAUTH_CALLBACK_MAX_ATTEMPTS = 10;
const OAUTH_CALLBACK_WINDOW_MINUTES = 15;

// An identity counts as "just attached by this sign-in" for two minutes.
// Older ones are never removed, so a buyer's earlier, legitimate sign-in
// method is never taken away by a blocked attempt.
const FRESH_IDENTITY_WINDOW_MS = 2 * 60 * 1000;

/** Removes the two short-lived OAuth cookies from a response. */
function clearOAuthCookies(response: NextResponse): void {
  for (const cookieName of [OAUTH_PKCE_COOKIE, OAUTH_PROVIDER_COOKIE]) {
    response.cookies.set(cookieName, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
  }
}

/** Sends the visitor to the login page with a short error code and clears the OAuth cookies. */
function redirectToLogin(errorCode: OAuthErrorCode): NextResponse {
  const loginUrl = new URL("/auth/login", getSiteUrl());
  loginUrl.searchParams.set("oauthError", errorCode);
  const response = NextResponse.redirect(loginUrl);
  clearOAuthCookies(response);
  return response;
}

/**
 * buildMoveOnPage
 * A minimal page that moves the browser to the dashboard. The path is a
 * fixed constant from roleRouting, never taken from the request.
 */
function buildMoveOnPage(destinationPath: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${destinationPath}"><title>Signing you in</title></head><body><p>Signing you in…</p><script>window.location.replace(${JSON.stringify(destinationPath)});</script><noscript><a href="${destinationPath}">Continue</a></noscript></body></html>`;
}

/**
 * removeFreshIdentity
 * Best effort. Removes the identity this sign-in has just attached to an
 * account it must not touch. Skipped when the identity is not fresh or is
 * the account's only one (Supabase refuses to remove the last identity).
 * A failure is logged and never stops the block.
 */
async function removeFreshIdentity(
  client: SupabaseClient,
  identities: UserIdentity[],
  provider: string,
  actor: string | null,
  request: Request
): Promise<void> {
  if (identities.length < 2) return;

  const freshIdentity = identities.find(
    (identity) =>
      identity.provider === provider &&
      Date.now() - new Date(identity.created_at ?? 0).getTime() < FRESH_IDENTITY_WINDOW_MS
  );
  if (!freshIdentity) return;

  const { error } = await client.auth.unlinkIdentity(freshIdentity);
  if (error) {
    await logSecurityEvent({
      eventType: "oauth_unlink_failed",
      actor,
      request,
      details: `Could not remove the ${provider} identity after a blocked sign-in: ${error.message}`,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "oauth-callback", OAUTH_CALLBACK_MAX_ATTEMPTS, OAUTH_CALLBACK_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        request,
        details: "Rate limit hit on /api/auth/oauth/callback",
      });
      return redirectToLogin("rate_limited");
    }

    const code = new URL(request.url).searchParams.get("code");
    const provider = request.cookies.get(OAUTH_PROVIDER_COOKIE)?.value;
    const snapshot = parseSnapshot(request.cookies.get(OAUTH_PKCE_COOKIE)?.value);

    // No code (the user cancelled at the provider), or the cookies from the
    // start route are missing or tampered with: nothing can be trusted.
    if (!code || !snapshot || !isSupportedOAuthProvider(provider)) {
      await logSecurityEvent({
        eventType: "login_failed",
        request,
        details: "OAuth callback without a valid code, verifier or provider",
      });
      return redirectToLogin("generic");
    }

    const { client } = createOAuthClient(snapshot);
    const { data: exchange, error: exchangeError } = await client.auth.exchangeCodeForSession(code);

    if (exchangeError || !exchange.user || !exchange.session) {
      await logSecurityEvent({
        eventType: "login_failed",
        request,
        details: `OAuth (${provider}) code exchange failed`,
      });
      return redirectToLogin("generic");
    }

    const user = exchange.user;
    const session = exchange.session;
    const actor = user.email ?? null;

    // Ask Supabase for the full list of sign-in methods instead of trusting
    // the user object alone. If this fails, nothing can be checked — block.
    const { data: identityData, error: identityError } = await client.auth.getUserIdentities();
    if (identityError || !identityData) {
      await client.auth.signOut({ scope: "local" });
      await logSecurityEvent({
        eventType: "login_failed",
        actor,
        request,
        details: `OAuth (${provider}) sign-in methods could not be read`,
      });
      return redirectToLogin("generic");
    }
    const identities = identityData.identities;

    const outcome = decideOAuthOutcome({
      email: user.email ?? null,
      isEmailVerified: Boolean(user.email_confirmed_at),
      role: (user.user_metadata?.role as string | undefined) ?? null,
      identityProviders: identities.map((identity) => identity.provider),
    });

    // --- BLOCKED: remove what this attempt attached, end only THIS session,
    // log it, and send the visitor back to the login page. ---
    if (isBlockedOutcome(outcome)) {
      await removeFreshIdentity(client, identities, provider, actor, request);

      // scope "local" ends only this one session. The default would end
      // every session the account has, logging the real owner out everywhere.
      await client.auth.signOut({ scope: "local" });

      await logSecurityEvent({
        eventType: "oauth_login_blocked",
        actor,
        request,
        details: `OAuth (${provider}) sign-in blocked: ${outcome}`,
      });
      return redirectToLogin(getOAuthErrorCode(outcome));
    }

    // --- ALLOWED ---
    // A first-time OAuth user has no role yet. Set it here, on the server,
    // to "buyer" — never from anything the client sends.
    if (outcome === "allow_new_buyer") {
      const { error: roleError } = await supabaseAdminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata ?? {}), role: "buyer" },
      });

      if (roleError) {
        await client.auth.signOut({ scope: "local" });
        await logSecurityEvent({
          eventType: "login_failed",
          actor,
          request,
          details: `OAuth (${provider}) could not set the buyer role: ${roleError.message}`,
        });
        return redirectToLogin("generic");
      }
    }

    await logSecurityEvent({
      eventType: "login_success",
      actor,
      request,
      details: `OAuth (${provider}) sign-in as role: buyer (${outcome === "allow_new_buyer" ? "new account" : "returning"})`,
    });

    // Same impossible-travel check as the password login. A blocked result
    // ends the session before any cookie is set.
    const anomalyCheck = await detectAnomalies({ accountId: actor ?? user.id, request });
    if (anomalyCheck.blocked) {
      await client.auth.signOut({ scope: "local" });
      return redirectToLogin("unusual_activity");
    }

    const response = new NextResponse(buildMoveOnPage(getDashboardPathForRole("buyer")), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });

    // The one shared cookie step both password logins use (lib/loginSession.ts).
    setSessionCookies(response, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
    });
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    // Never show raw errors to the visitor — log for the developer, send a generic message.
    console.error("[oauth/callback] Unexpected error:", (error as Error).message);
    return redirectToLogin("generic");
  }
}
