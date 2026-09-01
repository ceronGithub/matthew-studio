/**
 * FILE: middleware.ts
 * PURPOSE:
 * Route guard for the auth flow described in
 * login_and_registration_page.md Sections 7-8. Reads the sb-access-token
 * HttpOnly cookie set by /api/auth/login and /api/auth/register,
 * validates it against Supabase, and redirects based on role. All
 * route protection lives here — never inside page components.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };
  const role = (data.user?.user_metadata?.role as string) ?? null;

  // Buyer area requires a valid session with role "buyer".
  if (pathname.startsWith("/buyer") && role !== "buyer") {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in and hitting the login page — send them to their dashboard
  // instead of showing the form again.
  if (pathname === "/auth/login" && role) {
    const destination = role === "buyer" ? "/buyer/dashboard" : "/superAdmin/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/buyer/:path*", "/auth/login"],
};
