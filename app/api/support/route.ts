/**
 * FILE: app/api/support/route.ts
 * ROLE: Public — receives Support page (/support) contact form
 * submissions. Separate from /api/contact (the Get-a-Demo form on
 * /contact, which also collects name/resort/tier) since a support
 * request is a different shape and a different downstream queue —
 * keeping them in one route would mean optional-everything validation
 * that can't tell a malformed demo request from a valid support one.
 *
 * PURPOSE:
 * Validates the incoming { email, subject, message } payload
 * server-side (never trust the client-side check alone) and returns
 * a consistent success/error JSON shape. No email/database delivery
 * is wired up yet — this is the placeholder step; swap the TODO below
 * for EmailJS (services/emailjs.ts) or a Supabase `supportTickets`
 * table once one of those is configured for this project.
 *
 * DATA FLOW:
 * 1. SupportForm (Client Component) POSTs { email, subject, message }
 *    as JSON.
 * 2. This handler validates required fields, email format, and that
 *    subject is one of the dropdown's known values.
 * 3. On success, logs the submission (audit trail placeholder) and
 *    returns { success: true }.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors SUPPORT_SUBJECT_OPTIONS in components/support/SupportForm.tsx —
// re-declared here so the server never trusts a subject value the
// client didn't actually offer.
const VALID_SUBJECTS = ["general", "order-payment", "technical", "other"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    // Required-field check — mirrors the frontend validation, never trusted alone
    if (!email || !subject || !message) {
      return NextResponse.json(
        { success: false, data: null, message: "Please fill in your email, subject, and message." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json(
        { success: false, data: null, message: "Please choose a valid subject." },
        { status: 400 }
      );
    }

    // TODO: send via EmailJS (services/emailjs.ts) or insert into a
    // Supabase `supportTickets` table once one is set up for this
    // project (see Rule 35 in the dev protocol). For now, log
    // server-side so submissions are visible during development.
    console.log("[support] New submission:", { email, subject });

    return NextResponse.json({
      success: true,
      data: null,
      message: "Message sent — we'll get back to you within one business day.",
    });
  } catch (error) {
    console.error("[support] Failed to process submission:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
