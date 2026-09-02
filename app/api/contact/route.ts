/**
 * FILE: app/api/contact/route.ts
 * ROLE: Public — receives Contact/Get Demo form submissions.
 *
 * PURPOSE:
 * Validates the incoming form payload server-side (never trust the
 * client-side check alone) and sends it on via EmailJS
 * (services/emailjs.ts), returning a consistent success/error JSON
 * shape either way.
 *
 * DATA FLOW:
 * 1. ContactForm (Client Component) POSTs { name, email, businessName,
 *    category, tier, message } as JSON. `tier` is Templates-only and
 *    may be empty for every other category.
 * 2. This handler validates required fields and email format.
 * 3. On success, sends the submission via EmailJS's "contact_form"
 *    template (EMAILJS_TEMPLATE_ID_CONTACT) and returns
 *    { success: true }. A failed send returns a 502 with a clean
 *    error message — the submitter's input is never lost silently.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendEmail } from "@/services/emailjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
    const category = typeof body?.category === "string" ? body.category.trim() : "";
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

    const result = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_CONTACT ?? "", {
      from_name: name,
      from_email: email,
      business_name: businessName || "—",
      category: category || "—",
      tier: tier || "—",
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
    console.error("[contact] Failed to process submission:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
