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
 * server-side (never trust the client-side check alone) and sends it
 * on via EmailJS (services/emailjs.ts), returning a consistent
 * success/error JSON shape either way.
 *
 * DATA FLOW:
 * 1. SupportForm (Client Component) POSTs { email, subject, message }
 *    as JSON.
 * 2. This handler validates required fields, email format, and that
 *    subject is one of the dropdown's known values.
 * 3. On success, sends the submission via EmailJS's "support_request"
 *    template (EMAILJS_TEMPLATE_ID_SUPPORT) and returns
 *    { success: true }. A failed send returns a 502 with a clean
 *    error message — the submitter's input is never lost silently.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendEmail } from "@/services/emailjs";

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

    const result = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_SUPPORT ?? "", {
      from_email: email,
      subject,
      message,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, data: null, message: result.message ?? "Failed to send your message. Please try again." },
        { status: 502 }
      );
    }

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
