/**
 * FILE: app/api/auth/recovery-setup/email/route.ts
 * ROLE: Buyer (must be logged in — checked via getSessionUserId)
 *
 * PURPOSE:
 * Step 1 of the mandatory post-registration recovery setup
 * (buyer_password_recovery_specification.md Section 2.1 / 5). Handles
 * both actions the UI needs from a single endpoint:
 *   - { action: "send" }              → generate + email a 6-digit OTP
 *   - { action: "verify", code }      → check the OTP, mark verified
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId from the sb-access-token cookie
 * 2. "send": rate-limit, generate code, hash it (lib/emailOtp.ts),
 *    upsert onto BuyerRecovery, email it via EmailJS
 * 3. "verify": compare hash + expiry, flip emailVerifiedForRecovery
 * 4. Every attempt is logged to SecurityLog for the audit trail —
 *    this is the setup flow, not the forgot-password flow, so these
 *    events are informational only (no Gatekeeper strike wiring here;
 *    that applies to password_recovery_failed in the Section 4 flow,
 *    a separate task).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { sendEmail } from "@/services/emailjs";
import { getSessionUserId, getSessionUser } from "@/lib/getSessionUserId";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import {
  generateEmailOtpCode,
  hashEmailOtpCode,
  emailOtpCodeMatches,
  EMAIL_OTP_EXPIRY_MINUTES,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/emailOtp";

const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Please sign in again to continue." },
        { status: 401 }
      );
    }

    const ipAddress = getClientIp(request);
    // Combined rate limit across send+verify for this endpoint — same
    // "5 attempts / 15 min" priority-endpoint budget as Rule 32.1.
    const rateLimit = await checkRateLimit(ipAddress, "recovery-setup-email", OTP_MAX_ATTEMPTS, OTP_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action: string = body.action ?? "";

    if (action === "send") {
      // Enforce the 60-second resend cooldown (Section 2.1) — read the
      // existing row first so a fast double-click doesn't send twice.
      const existing = await prisma.buyerRecovery.findUnique({ where: { userId } });
      if (existing?.emailOtpSentAt) {
        const secondsSinceLastSend = (Date.now() - existing.emailOtpSentAt.getTime()) / 1000;
        if (secondsSinceLastSend < EMAIL_OTP_RESEND_COOLDOWN_SECONDS) {
          const retryAfter = Math.ceil(EMAIL_OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
          return NextResponse.json(
            {
              success: false,
              data: { retryAfterSeconds: retryAfter },
              message: `Please wait ${retryAfter}s before requesting another code.`,
            },
            { status: 429 }
          );
        }
      }

      const code = generateEmailOtpCode();
      const codeHash = hashEmailOtpCode(code);
      const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);

      const buyerEmail = (await getBuyerEmail(request)) ?? "";

      const emailResult = await sendEmail(process.env.EMAILJS_TEMPLATE_ID_RECOVERY_OTP ?? "", {
        to_email: buyerEmail,
        otp_code: code,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, data: null, message: emailResult.message ?? "Failed to send email. Please try again." },
          { status: 500 }
        );
      }

      // Upsert: the buyer's BuyerRecovery row may not exist yet — this
      // is the first recovery-setup step to touch it after registration.
      await prisma.buyerRecovery.upsert({
        where: { userId },
        create: { userId, emailOtpCodeHash: codeHash, emailOtpExpiresAt: expiresAt, emailOtpSentAt: new Date() },
        update: { emailOtpCodeHash: codeHash, emailOtpExpiresAt: expiresAt, emailOtpSentAt: new Date() },
      });

      await logSecurityEvent({
        eventType: "recovery_setup_email_otp_sent",
        actor: userId,
        request,
        details: "Recovery setup: email OTP sent",
      });

      return NextResponse.json({ success: true, data: { sent: true }, message: "Code sent to your email." });
    }

    if (action === "verify") {
      const submittedCode: string = (body.code ?? "").trim();

      const recovery = await prisma.buyerRecovery.findUnique({ where: { userId } });
      const isExpired = !recovery?.emailOtpExpiresAt || recovery.emailOtpExpiresAt.getTime() < Date.now();
      const isMatch =
        !isExpired && recovery?.emailOtpCodeHash
          ? emailOtpCodeMatches(submittedCode, recovery.emailOtpCodeHash)
          : false;

      if (!isMatch) {
        await logSecurityEvent({
          eventType: "recovery_setup_email_otp_failed",
          actor: userId,
          request,
          details: isExpired ? "Recovery setup: email OTP expired" : "Recovery setup: wrong email OTP",
        });
        return NextResponse.json(
          { success: false, data: null, message: "Incorrect code. Please try again." },
          { status: 400 }
        );
      }

      // Clear the code once consumed — a verified OTP can't be reused,
      // and a stale hash never lingers in the row after success.
      await prisma.buyerRecovery.update({
        where: { userId },
        data: {
          emailVerifiedForRecovery: true,
          emailOtpCodeHash: null,
          emailOtpExpiresAt: null,
        },
      });

      await logSecurityEvent({
        eventType: "recovery_setup_email_verified",
        actor: userId,
        request,
        details: "Recovery setup: email verified",
      });

      return NextResponse.json({
        success: true,
        data: { emailVerified: true },
        message: "Email verified successfully.",
      });
    }

    return NextResponse.json(
      { success: false, data: null, message: "Unrecognized request." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[recovery-setup/email] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * getBuyerEmail
 * The OTP has to be sent somewhere — Supabase Auth is the source of
 * truth for the buyer's email (this repo has no local Buyer table,
 * same reasoning as BuyerRecovery's header comment), so this re-uses
 * getSessionUser's Supabase lookup rather than trusting a
 * client-submitted email address.
 */
async function getBuyerEmail(request: Request): Promise<string | null> {
  const user = await getSessionUser(request);
  return user?.email ?? null;
}
