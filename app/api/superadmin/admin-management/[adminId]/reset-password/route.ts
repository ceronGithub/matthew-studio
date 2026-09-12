/**
 * FILE: app/api/superadmin/admin-management/[adminId]/reset-password/route.ts
 * ROLE: Super-admin only — strictly role === "superAdmin", same gate
 * as the parent [adminId]/route.ts.
 *
 * PURPOSE:
 * super_admin_account_specification.md Section 3.2.3's separate
 * "Reset Password" button — task-95, part 3 of 4.
 *
 * GROUNDING NOTE (Rule 0D): the buyer equivalent of this action
 * (app/api/admin/users/[buyerId]/actions/route.ts's "reset_password"
 * case) emails a reset LINK backed by BuyerRecovery's
 * forgotPasswordResetTokenHash field. There is no admin-side
 * equivalent of that table in prisma/schema.prisma — BuyerRecovery is
 * buyer-specific (Section 2's email/Telegram/security-question setup
 * fields would be meaningless for an admin account), and adding a
 * parallel AdminRecovery table just to hold one token is out of scope
 * for this task. Instead, this route follows
 * app/api/admin/create-admin/route.ts's own precedent: it rotates the
 * admin's Supabase Auth password directly to a fresh random temp
 * password and emails that, rather than a reset link. No new schema
 * required, and the admin can change it again immediately after
 * logging in.
 *
 * DATA FLOW:
 * 1. Resolve the calling account via getSessionAdmin(); 403 unless
 *    role === "superAdmin".
 * 2. Look up the target via lib/getAdminAuthUser.ts — 404 if not
 *    found or not role "admin"; 400 if the account has no email on
 *    file (nothing to send the new password to).
 * 3. Generate a 16-char temp password (same charset/length as
 *    create-admin's generateTempPassword()), write it via
 *    supabaseAdminClient.auth.admin.updateUserById().
 * 4. Email it via a dedicated EmailJS template
 *    (EMAILJS_TEMPLATE_ID_SUPERADMIN_ADMIN_PASSWORD_RESET — Rule
 *    35.5: one template per email type; distinct from
 *    EMAILJS_TEMPLATE_ID_ADMIN_PASSWORD_RESET, which is the buyer-
 *    facing reset-link template).
 * 5. Log admin_password_reset to SecurityLog (Rule 38).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { getAdminAuthUser } from "@/lib/getAdminAuthUser";
import { logSecurityEvent } from "@/lib/securityLog";
import { sendEmail } from "@/services/emailjs";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

// Same charset/length as app/api/admin/create-admin/route.ts's
// generateTempPassword() — excludes visually-ambiguous characters
// (0/O, 1/l/I) since this is read off an email and typed once, not
// stored long-term.
const TEMP_PASSWORD_LENGTH = 16;
const TEMP_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";

function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARSET[randomInt(0, TEMP_PASSWORD_CHARSET.length)];
  }
  return password;
}

export async function POST(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    if (admin.role !== "superAdmin") {
      return NextResponse.json(
        { success: false, data: null, message: "You don't have permission to view this page." },
        { status: 403 }
      );
    }

    const { adminId } = await params;

    const authUser = await getAdminAuthUser(adminId);
    if (!authUser) {
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't find that admin account. It may have been removed." },
        { status: 404 }
      );
    }

    const targetEmail = authUser.email ?? null;
    if (!targetEmail) {
      return NextResponse.json(
        { success: false, data: null, message: "This admin has no email on file." },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();
    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(adminId, {
      password: tempPassword,
    });
    if (updateError) {
      console.error("[api/.../reset-password POST] Supabase update failed:", updateError.message);
      return NextResponse.json(
        { success: false, data: null, message: "We couldn't reset this admin's password. Please try again." },
        { status: 500 }
      );
    }

    const emailResult = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_SUPERADMIN_ADMIN_PASSWORD_RESET ?? "", {
      to_email: targetEmail,
      temp_password: tempPassword,
    });
    if (!emailResult.success) {
      // The password was already rotated at this point — surface the
      // email failure clearly rather than implying nothing happened,
      // so the super-admin knows to relay the situation manually.
      return NextResponse.json(
        {
          success: false,
          data: null,
          message:
            emailResult.message ??
            "The password was reset, but we couldn't email it. Please contact the admin directly.",
        },
        { status: 502 }
      );
    }

    await logSecurityEvent({
      eventType: "admin_password_reset",
      actor: admin.email,
      request,
      details: `Admin ${targetEmail}: password reset by super-admin`,
    });

    return NextResponse.json({
      success: true,
      data: { sentTo: targetEmail },
      message: "A new temporary password has been emailed to this admin.",
    });
  } catch (error) {
    console.error("[api/.../reset-password POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, data: null, message: "We couldn't reset this admin's password. Please try again." },
      { status: 500 }
    );
  }
}
