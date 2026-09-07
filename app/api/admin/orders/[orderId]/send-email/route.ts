/**
 * FILE: app/api/admin/orders/[orderId]/send-email/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.3.1 Row Action "Send
 * Email" / Section 3.3.2 "Send Tracking Email" — lets an admin
 * compose and send a message to the buyer using a preset EmailJS
 * template, without leaving the order detail page.
 *
 * PRESET SELECTION: one shared EmailJS template
 * (EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL, per Rule 35.5's one-
 * template-per-email-type naming) carries a `preset_subject` variable
 * the admin picks from a short list, rather than one EmailJS template
 * per preset — keeps template management in one place in the EmailJS
 * dashboard instead of growing a template per preset. The dashboard
 * template itself decides subject/body layout from the passed
 * variables; this route only validates and forwards them.
 *
 * Guest orders (guestEmail, no userId) CAN receive this email — email
 * delivery doesn't require an account, unlike task-77's
 * createNotification() calls which do.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { logSecurityEvent } from "@/lib/securityLog";
import { sendEmail } from "@/services/emailjs";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

const PRESETS = ["shipped_tracking", "order_confirmed", "general_update", "custom"] as const;
type Preset = (typeof PRESETS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await request.json();
    const preset: Preset | undefined = body?.preset;
    const subject: string | undefined = body?.subject?.trim();
    const messageBody: string | undefined = body?.body?.trim();

    if (!preset || !PRESETS.includes(preset)) {
      return NextResponse.json(
        { success: false, data: null, message: "Please choose a valid email preset." },
        { status: 400 }
      );
    }
    if (!subject || !messageBody) {
      return NextResponse.json(
        { success: false, data: null, message: "Please fill in both a subject and a message." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
    if (!order) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that order. It may have been moved or deleted." },
        { status: 404 }
      );
    }

    // Resolve buyer email: guestEmail direct, otherwise a Supabase
    // Auth lookup — same pattern as the list/detail routes.
    let buyerEmail = order.guestEmail;
    if (!buyerEmail && order.userId) {
      const { data } = await supabaseAdminClient.auth.admin.getUserById(order.userId);
      buyerEmail = data.user?.email ?? null;
    }

    if (!buyerEmail) {
      return NextResponse.json(
        { success: false, data: null, message: "This order has no email on file to send to." },
        { status: 400 }
      );
    }

    const templateId = process.env.EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL ?? "";
    const result = await sendEmail(templateId, {
      to_email: buyerEmail,
      preset_subject: subject,
      message: messageBody,
      order_id: order.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, data: null, message: result.message ?? "Failed to send email. Please try again." },
        { status: 502 }
      );
    }

    await logSecurityEvent({
      eventType: "admin_action",
      actor: admin.email,
      request,
      details: `Order ${orderId}: sent "${preset}" email to buyer`,
    });

    return NextResponse.json({
      success: true,
      data: { sentTo: buyerEmail, preset },
      message: "Email sent to the buyer.",
    });
  } catch (error) {
    console.error("[api/admin/orders/[orderId]/send-email POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't send this email. Please try again." },
      { status: 500 }
    );
  }
}
