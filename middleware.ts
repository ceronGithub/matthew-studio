/**
 * FILE: middleware.ts
 * PURPOSE:
 * Route guard for the auth flow described in
 * login_and_registration_page.md Sections 7-8 and 12.3. Reads the
 * sb-access-token HttpOnly cookie set by /api/auth/login and
 * /api/auth/register, validates it against Supabase, and redirects
 * based on role. All route protection lives here — never inside page
 * components.
 *
 * Gatekeeper (gatekeeper_specification.md, Rule 47.3) runs FIRST,
 * ahead of role-based routing and ahead of any Supabase session
 * lookup — a banned device is rejected before the request does any
 * further work. The fingerprint here is header-only (no client JS
 * involved), matching lib/deviceFingerprint.ts's narrower Gatekeeper
 * hash so the same device produces the same fingerprint whether it's
 * hitting a page route or an API route.
 *
 * Three separate protected areas, per Section 12.3 — never collapsed
 * into one "any non-buyer" check:
 *   /buyer/*      requires role "buyer"
 *   /admin/*      requires role "admin" OR "superAdmin" (super-admin
 *                 can reach admin tooling too; admin cannot reach
 *                 super-admin's routes — see next line)
 *   /superAdmin/* requires role "superAdmin" only
 *
 * Also issues the CSRF double-submit cookie (Rule 32.2) for every
 * matched request that doesn't already have one, so it's in place
 * before any auth form or Sign Out call ever submits.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/csrf";
import { getDashboardPathForRole } from "@/lib/roleRouting";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";
import { checkDeviceBan } from "@/lib/gatekeeper";

const isProduction = process.env.NODE_ENV === "production";

// Sends an unauthorized visitor to /auth/login with a ?next= prefill
// so they land back where they were headed after signing in.
function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// Generic rejection for a banned device — the response deliberately
// never explains WHY (Rule 47.3: "never reveal why the device was
// banned"), so an attacker probing the ban can't learn anything from
// the error shape.
function rejectBannedDevice(): NextResponse {
  return NextResponse.json(
    { success: false, data: null, message: "This request could not be completed." },
    { status: 403 }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Gatekeeper: runs before anything else, including auth lookup ---
  const deviceFingerprint = generateDeviceFingerprint(request.headers);
  const activeBan = await checkDeviceBan(deviceFingerprint);
  if (activeBan) {
    return rejectBannedDevice();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };
  const role = (data.user?.user_metadata?.role as string) ?? null;

  let response: NextResponse;

  if (pathname.startsWith("/buyer") && role !== "buyer") {
    response = redirectToLogin(request, pathname);
  } else if (pathname.startsWith("/superAdmin") && role !== "superAdmin") {
    response = redirectToLogin(request, pathname);
  } else if (pathname.startsWith("/admin") && role !== "admin" && role !== "superAdmin") {
    response = redirectToLogin(request, pathname);
  } else if (pathname === "/auth/login" && role) {
    // Already signed in and hitting the login page — send them to their
    // own dashboard instead of showing the form again. Buyer, admin, and
    // super-admin each land on a different route (Section 12.3) — never
    // a single shared destination.
    response = NextResponse.redirect(new URL(getDashboardPathForRole(role), request.url));
  } else {
    // Forward the matched pathname to Server Components via a request
    // header (next/headers has no direct "current path" API) — used
    // by app/superAdmin/layout.tsx to record account activity
    // (Rule 42) without needing a client-side beacon.
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set("x-pathname", pathname);
    response = NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  // Issue the CSRF cookie once per session — non-HttpOnly by design,
  // since the double-submit pattern requires client JS to read it and
  // echo it back as a header (Rule 32.2). Only set when missing, so
  // the token stays stable across navigations within one session
  // instead of invalidating an in-flight form on every page load.
  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours — long enough for one auth session, short enough to rotate regularly
    });
  }

  return response;
}

export const config = {
  // /api/auth/:path* is included so Gatekeeper's ban check also
  // covers pre-auth login/register/forgot-password calls, not just
  // page navigation — a banned device must be rejected before it can
  // even attempt to log in (Rule 47.3).
  matcher: [
    "/buyer/:path*",
    "/admin/:path*",
    "/superAdmin/:path*",
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};
