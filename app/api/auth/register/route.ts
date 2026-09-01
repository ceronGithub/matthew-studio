/**
 * FILE: app/api/auth/register/route.ts
 * PURPOSE:
 * Creates a new buyer account via Supabase Auth. This is the only
 * self-service registration path in the app — role is always forced
 * to "buyer" here regardless of anything the client sends, per
 * login_and_registration_page.md Section 13. Admin/super-admin
 * accounts are never created through this endpoint.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase/serverClient";

const isProduction = process.env.NODE_ENV === "production";
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

function isPasswordStrongEnough(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = body.email ?? "";
    const password: string = body.password ?? "";
    // Strip forbidden characters server-side too — never trust the client filter alone.
    const fullName: string = (body.fullName ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");

    if (fullName.length < 2) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your full name.", error: "Validation failed" },
        { status: 400 }
      );
    }
    if (!isPasswordStrongEnough(password)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Password must include an uppercase letter, a number, and a special character.",
          error: "Validation failed",
        },
        { status: 400 }
      );
    }

    // CRITICAL: role is always "buyer" here — never read from the request body,
    // so this endpoint can never be used to create an admin/superAdmin account.
    const { data, error } = await supabaseServerClient.auth.signUp({
      email,
      password,
      options: { data: { fullName, role: "buyer" } },
    });

    if (error) {
      const isDuplicate = error.message.toLowerCase().includes("already registered");
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: isDuplicate
            ? "Email already registered. Please sign in instead."
            : "Could not create account. Please try again.",
          error: error.message,
        },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { userId: data.user?.id, email: data.user?.email, role: "buyer" },
      message: "Account created successfully.",
    });

    // Auto-login: if Supabase returned a session immediately (email
    // confirmation disabled), set the same cookies the login route sets.
    if (data.session) {
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: data.session.expires_in,
      });
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    console.error("[auth/register] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
