/**
 * FILE: app/api/contact/route.ts
 * ROLE: Public — receives Contact/Get Demo form submissions.
 *
 * PURPOSE:
 * Validates the incoming form payload server-side (never trust the
 * client-side check alone) and returns a consistent success/error
 * JSON shape. No email/database delivery is wired up yet — this is
 * the placeholder step; swap the TODO below for EmailJS
 * (services/emailjs.ts) or a Supabase `contactSubmissions` table
 * once one of those is configured for this project.
 *
 * DATA FLOW:
 * 1. ContactForm (Client Component) POSTs { name, email, resortName,
 *    tier, message } as JSON.
 * 2. This handler validates required fields and email format.
 * 3. On success, logs the submission (audit trail placeholder) and
 *    returns { success: true }.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const resortName = typeof body?.resortName === "string" ? body.resortName.trim() : "";
    const tier = typeof body?.tier === "string" ? body.tier.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    // Required-field check — mirrors the frontend validation, never trusted alone
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, data: null, message: "Please fill in your name, email, and message." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    // TODO: send via EmailJS (services/emailjs.ts) or insert into a
    // Supabase `contactSubmissions` table once one is set up for this
    // project (see Rule 35 in the dev protocol). For now, log server-side
    // so submissions are visible during development.
    console.log("[contact] New submission:", { name, email, resortName, tier });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Message sent — we'll get back to you within one business day.",
    });
  } catch (error) {
    console.error("[contact] Failed to process submission:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
