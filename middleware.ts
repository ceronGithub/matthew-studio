/**
 * FILE: middleware.ts
 * PURPOSE:
 * Route guard for the auth flow described in
 * login_and_registration_page.md Sections 7-8. Reads the sb-access-token
 * HttpOnly cookie set by /api/auth/login and /api/auth/register,
 * validates it against Supabase, and redirects based on role. All
 * route protection lives here — never inside page components.
 *
 * Also issues the CSRF double-submit cookie (Rule 32.2) for every
 * matched request that doesn't already have one, so it's in place
 * before any auth form on /auth/* ever submits, and before BuyerNav's
 * Sign Out call on /buyer/*.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/csrf";

const isProduction = process.env.NODE_ENV === "production";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };
  const role = (data.user?.user_metadata?.role as string) ?? null;

  let response: NextResponse;

  // Buyer area requires a valid session with role "buyer".
  if (pathname.startsWith("/buyer") && role !== "buyer") {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (pathname === "/auth/login" && role) {
    // Already signed in and hitting the login page — send them to their
    // dashboard instead of showing the form again.
    const destination = role === "buyer" ? "/buyer/dashboard" : "/superAdmin/dashboard";
    response = NextResponse.redirect(new URL(destination, request.url));
  } else {
    response = NextResponse.next();
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
  matcher: ["/buyer/:path*", "/auth/:path*"],
};
