/**
 * FILE: app/api/admin/users/[buyerId]/actions/route.ts
 * ROLE: Admin/super-admin only — self-checked via getSessionAdmin()
 * since /api/admin/* is not in middleware.ts's matcher.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.4.1 (Row Actions) and
 * 3.4.2 (Actions) — five distinct actions on a single buyer account,
 * grouped into one route (POST with an `action` discriminator)
 * rather than five separate route files. Same precedent as task-30's
 * grouped vault routes and task-77's grouped order actions.
 *
 * Actions:
 *   - "deactivate" / "reactivate" — flips the Supabase Auth user's
 *     ban_duration. No new local flag (task-83's own decision — see
 *     docs/tasks/task-83-schema-buyer-admin-meta.md): Supabase's
 *     ban_duration is already the source of truth task-84's list
 *     route reads for isActive, so this route writes to the same
 *     place rather than creating a second one that could drift.
 *   - "reset_password" — admin-initiated password reset. Reuses
 *     BuyerRecovery.forgotPasswordResetTokenHash/ExpiresAt (task-66)
 *     rather than adding new fields, per task-83's plan — the only
 *     difference from the buyer's own self-service flow (task-68) is
 *     that an admin triggers issuance instead of the buyer completing
 *     Step 3 of the forgot-password wizard. Emails the buyer a link
 *     to the existing /auth/reset-password page; the reset page
 *     itself and its API (task-68) require zero changes.
 *   - "send_email" — custom compose-a-message email via a dedicated
 *     EmailJS template (Rule 35.5: one template per email type,
 *     separate from task-78's order-scoped template since this one
 *     isn't tied to an order).
 *   - "add_note" — appends an internalNotes entry to task-83's
 *     BuyerAdminMeta (upserted — a buyer may not have a row yet if
 *     no note has ever been added).
 *
 * All five log a SecurityLog `admin_action` event (Rule 38).
 * Buyer lookup rejects any id whose role isn't "buyer" (an admin/
 * super-admin id typed into the URL 404s instead of being actioned
 * on) — lib/getBuyerAuthUser.ts, shared with task-85's detail route.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { getBuyerAuthUser } from "@/lib/getBuyerAuthUser";
import { logSecurityEvent } from "@/lib/securityLog";
import { sendEmail } from "@/services/emailjs";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import {
  generateResetToken,
  hashResetToken,
  FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
} from "@/lib/passwordResetToken";

// 100 years — Supabase's Admin API has no dedicated "disable" flag,
// only a ban_duration string; this is the same effectively-permanent
// convention used to mean "deactivated until a super-admin reverses
// it", never an auto-expiring timeout.
const DEACTIVATE_BAN_DURATION = "876600h";
const REACTIVATE_BAN_DURATION = "none";

interface InternalNoteEntry {
  note: string;
  adminId: string;
  createdAt: string;
}

async function handleDeactivate(buyerId: string) {
  await supabaseAdminClient.auth.admin.updateUserById(buyerId, {
    ban_duration: DEACTIVATE_BAN_DURATION,
  });
  return NextResponse.json({
    success: true,
    data: { isActive: false },
    message: "Buyer account deactivated.",
  });
}

async function handleReactivate(buyerId: string) {
  await supabaseAdminClient.auth.admin.updateUserById(buyerId, {
    ban_duration: REACTIVATE_BAN_DURATION,
  });
  return NextResponse.json({
    success: true,
    data: { isActive: true },
    message: "Buyer account reactivated.",
  });
}

async function handleResetPassword(buyerId: string, buyerEmail: string | null) {
  if (!buyerEmail) {
    return NextResponse.json(
      { success: false, data: null, message: "This buyer has no email on file." },
      { status: 400 }
    );
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Upsert: a buyer who has never gone through the forgot-password
  // flow may not have a BuyerRecovery row's reset-token fields set
  // yet, but the row itself is created at Step 1 of Rule 48's
  // recovery-setup gate, so this is a plain update in practice —
  // upsert guards the edge case defensively rather than assuming.
  await prisma.buyerRecovery.upsert({
    where: { userId: buyerId },
    update: { forgotPasswordResetTokenHash: resetTokenHash, forgotPasswordResetTokenExpiresAt: expiresAt },
    create: {
      userId: buyerId,
      forgotPasswordResetTokenHash: resetTokenHash,
      forgotPasswordResetTokenExpiresAt: expiresAt,
    },
  });

  const resetLink = `${process.env.APP_URL ?? ""}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
  const emailResult = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_ADMIN_PASSWORD_RESET ?? "", {
    to_email: buyerEmail,
    reset_link: resetLink,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { success: false, data: null, message: emailResult.message ?? "Failed to send the reset email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { sentTo: buyerEmail },
    message: "Password reset email sent to the buyer.",
  });
}

async function handleSendEmail(buyerEmail: string | null, body: { subject?: string; body?: string }) {
  const subject = body.subject?.trim();
  const messageBody = body.body?.trim();

  if (!subject || !messageBody) {
    return NextResponse.json(
      { success: false, data: null, message: "Please fill in both a subject and a message." },
      { status: 400 }
    );
  }
  if (!buyerEmail) {
    return NextResponse.json(
      { success: false, data: null, message: "This buyer has no email on file to send to." },
      { status: 400 }
    );
  }

  const emailResult = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_ADMIN_BUYER_EMAIL ?? "", {
    to_email: buyerEmail,
    subject,
    message: messageBody,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { success: false, data: null, message: emailResult.message ?? "Failed to send email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { sentTo: buyerEmail },
    message: "Email sent to the buyer.",
  });
}

async function handleAddNote(buyerId: string, adminId: string, body: { note?: string }) {
  const note = body.note?.trim();
  if (!note) {
    return NextResponse.json(
      { success: false, data: null, message: "Please enter a note before saving." },
      { status: 400 }
    );
  }

  const existingMeta = await prisma.buyerAdminMeta.findUnique({ where: { userId: buyerId } });
  const existingNotes = (existingMeta?.internalNotes as InternalNoteEntry[] | null) ?? [];
  const entry: InternalNoteEntry = { note, adminId, createdAt: new Date().toISOString() };
  const updatedNotes = [...existingNotes, entry];

  await prisma.buyerAdminMeta.upsert({
    where: { userId: buyerId },
    update: { internalNotes: updatedNotes },
    create: { userId: buyerId, internalNotes: updatedNotes },
  });

  return NextResponse.json({
    success: true,
    data: { internalNotes: updatedNotes },
    message: "Note added.",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { buyerId } = await params;

    const buyer = await getBuyerAuthUser(buyerId);
    if (!buyer) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that buyer. They may have been removed." },
        { status: 404 }
      );
    }
    const buyerEmail = buyer.email ?? null;

    const body = await request.json();
    const action = body?.action;

    let result: NextResponse;
    switch (action) {
      case "deactivate":
        result = await handleDeactivate(buyerId);
        break;
      case "reactivate":
        result = await handleReactivate(buyerId);
        break;
      case "reset_password":
        result = await handleResetPassword(buyerId, buyerEmail);
        break;
      case "send_email":
        result = await handleSendEmail(buyerEmail, body);
        break;
      case "add_note":
        result = await handleAddNote(buyerId, admin.id, body);
        break;
      default:
        return NextResponse.json(
          { success: false, data: null, message: "Unknown action requested." },
          { status: 400 }
        );
    }

    // Log the action regardless of outcome shape — only after the
    // handler ran, so we know it at least reached the DB/email layer.
    // Skipped for 400s (validation failures never touched anything).
    if (result.status < 400) {
      await logSecurityEvent({
        eventType: "admin_action",
        actor: admin.email,
        request,
        details: `Buyer ${buyerId}: ${action}`,
      });
    }

    return result;
  } catch (error) {
    console.error("[api/admin/users/[buyerId]/actions POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't complete this action. Please try again." },
      { status: 500 }
    );
  }
}
