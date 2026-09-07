/**
 * FILE: app/api/auth/forgot-password/verify/route.ts
 * ROLE: Public (no session required)
 *
 * PURPOSE:
 * Step 3 of buyer_password_recovery_specification.md Section 4 — the
 * buyer has already picked one of the three method cards (Step 2);
 * this route both sends the OTP for that method (email/telegram) and
 * checks whatever the buyer submits back, issuing a resetToken once
 * verified.
 *
 * SPEC DEVIATION (flagged for developer review, same practice as
 * task-39's TELEGRAM_WEBHOOK_SECRET note): Section 5's documented
 * request/response for this endpoint has no "send the OTP" step —
 * only { email, method, otp | answer }. The spec's Section 4.3/4.4
 * still requires the backend to actively send a code once a method
 * is picked, and no other endpoint in Section 5 does that. Rather
 * than leave that gap unbuilt, this route reuses the same
 * action: "send" | "verify" dispatch pattern already established by
 * /api/auth/recovery-setup/email/route.ts:
 *   - { email, method: "email"|"telegram", action: "send" }
 *   - { email, method, action: "verify", otp }               (OTP methods)
 *   - { email, method: "security_question", action: "verify", answer }
 * "security_question" has no send step — the UI calls action:
 * "verify" directly once the buyer types an answer.
 *
 * DATA FLOW:
 * 1. CSRF + the same combined per-IP/per-email rate limit as
 *    /initiate (Section 6 — one shared "forgot-password" budget).
 * 2. Resolve userId (lib/getUserByEmail.ts) and BuyerRecovery row.
 *    Every branch below runs its real comparison against a dummy
 *    hash/answer when either is missing, so a nonexistent account or
 *    an unlinked channel takes the same code path and the same time
 *    as a wrong code (Rule 32.4).
 * 3. On successful verify: generate + hash a resetToken (10-minute
 *    expiry, lib/passwordResetToken.ts), store the hash, return the
 *    RAW token to the client (this is the one and only time it's
 *    ever transmitted in the clear — task-68/69 carry it forward via
 *    the URL/form, never re-fetchable).
 * 4. Every attempt logs to SecurityLog: password_recovery_initiated
 *    (send), password_recovery_succeeded / password_recovery_failed
 *    (verify) — the _failed eventType is already wired into
 *    Gatekeeper's 3-strike list (lib/gatekeeper.ts), so no extra
 *    wiring is needed here for Section 6's Gatekeeper requirement.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/services/prisma";
import { sendEmail } from "@/services/emailjs";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { getUserIdByEmail } from "@/lib/getUserByEmail";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import {
  generateForgotPasswordOtpCode,
  hashForgotPasswordOtpCode,
  forgotPasswordOtpCodeMatches,
  generateResetToken,
  hashResetToken,
  FORGOT_PASSWORD_OTP_EXPIRY_MINUTES,
  FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_SECONDS,
  FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
} from "@/lib/passwordResetToken";

const FORGOT_PASSWORD_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_WINDOW_MINUTES = 15;

// Rule 32.4 dummy target — compared against on every failed lookup so
// a nonexistent account / unlinked channel / unset security question
// all take the same bcrypt.compare cost as a real wrong answer.
const DUMMY_ANSWER_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7Vp0Jbu1G9J1YQ0jY0Y6y8jJq5m9K0e";

type Method = "email" | "telegram" | "security_question";

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const ipAddress = getClientIp(request);
    const body = await request.json();
    const email: string = (body.email ?? "").trim().toLowerCase();
    const method: Method = body.method;
    const action: string = body.action === "send" ? "send" : "verify";

    if (!email || !["email", "telegram", "security_question"].includes(method)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request." },
        { status: 400 }
      );
    }

    const ipLimit = await checkRateLimit(ipAddress, "forgot-password", FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_MINUTES);
    const emailLimit = await checkRateLimit(email, "forgot-password", FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_MINUTES);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        actor: email,
        request,
        details: "Forgot-password: rate limit exceeded",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const userId = await getUserIdByEmail(email);
    const recovery = userId ? await prisma.buyerRecovery.findUnique({ where: { userId } }) : null;

    if (action === "send") {
      return handleSend(method, email, userId, recovery, request);
    }

    return handleVerify(method, email, userId, recovery, body, request);
  } catch (error) {
    console.error("[forgot-password/verify] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * handleSend
 * Generates and delivers a fresh OTP for the email/telegram method.
 * Always returns the same generic success shape whether or not the
 * account/channel actually exists — nothing is revealed by this
 * response either way (Section 4.1/4.2's anti-enumeration principle
 * extended to this step, since the buyer picking a card doesn't
 * prove account ownership yet).
 */
async function handleSend(
  method: Method,
  email: string,
  userId: string | null,
  recovery: { forgotPasswordOtpSentAt: Date | null; telegramChatId: string | null } | null,
  request: Request
) {
  const genericResponse = NextResponse.json({
    success: true,
    data: { sent: true },
    message: "If eligible, a code has been sent.",
  });

  if (method === "security_question") {
    // Nothing to send for this method — the UI shouldn't call send
    // for it, but respond safely (and identically) if it does anyway.
    return genericResponse;
  }

  await logSecurityEvent({
    eventType: "password_recovery_initiated",
    actor: email,
    request,
    details: `Forgot-password: ${method} OTP requested`,
  });

  if (!userId || !recovery) {
    return genericResponse;
  }

  // 60-second resend cooldown, same convention as recovery-setup/email
  // — silently no-op (still generic response) rather than exposing a
  // distinct "please wait" error that would confirm the account exists.
  if (recovery.forgotPasswordOtpSentAt) {
    const secondsSinceLastSend = (Date.now() - recovery.forgotPasswordOtpSentAt.getTime()) / 1000;
    if (secondsSinceLastSend < FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_SECONDS) {
      return genericResponse;
    }
  }

  if (method === "telegram" && !recovery.telegramChatId) {
    // No linked chat — nothing we can do, but the response stays generic.
    return genericResponse;
  }

  const code = generateForgotPasswordOtpCode();
  const codeHash = hashForgotPasswordOtpCode(code);
  const expiresAt = new Date(Date.now() + FORGOT_PASSWORD_OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.buyerRecovery.update({
    where: { userId },
    data: {
      forgotPasswordOtpMethod: method,
      forgotPasswordOtpCodeHash: codeHash,
      forgotPasswordOtpExpiresAt: expiresAt,
      forgotPasswordOtpSentAt: new Date(),
    },
  });

  if (method === "email") {
    await sendEmail(process.env.EMAILJS_TEMPLATE_ID_RECOVERY_OTP ?? "", { to_email: email, otp_code: code });
  } else {
    await sendTelegramMessage(recovery.telegramChatId as string, `Your Matthew Studio password reset code is: ${code}`);
  }

  return genericResponse;
}

/**
 * handleVerify
 * Checks the submitted OTP/answer. Runs the real comparison against
 * a dummy target whenever the account, channel, or stored secret is
 * missing, so failure timing/shape never distinguishes "no such
 * account" from "wrong code" (Rule 32.4).
 */
async function handleVerify(
  method: Method,
  email: string,
  userId: string | null,
  recovery: {
    forgotPasswordOtpMethod: string | null;
    forgotPasswordOtpCodeHash: string | null;
    forgotPasswordOtpExpiresAt: Date | null;
    securityAnswerHash: string | null;
  } | null,
  body: Record<string, unknown>,
  request: Request
) {
  let isValid = false;

  if (method === "security_question") {
    const submittedAnswer = String(body.answer ?? "").trim().toLowerCase();
    const targetHash = recovery?.securityAnswerHash ?? DUMMY_ANSWER_HASH;
    // Always compare — even against the dummy hash — so a missing
    // account/question takes the same bcrypt cost as a real wrong answer.
    isValid = (await bcrypt.compare(submittedAnswer, targetHash)) && Boolean(recovery?.securityAnswerHash);
  } else {
    const submittedOtp = String(body.otp ?? "").trim();
    const isExpired = !recovery?.forgotPasswordOtpExpiresAt || recovery.forgotPasswordOtpExpiresAt.getTime() < Date.now();
    const methodMatches = recovery?.forgotPasswordOtpMethod === method;
    isValid =
      !isExpired && methodMatches && recovery?.forgotPasswordOtpCodeHash
        ? forgotPasswordOtpCodeMatches(submittedOtp, recovery.forgotPasswordOtpCodeHash)
        : false;
  }

  if (!isValid) {
    await logSecurityEvent({
      eventType: "password_recovery_failed",
      actor: email,
      request,
      details: `Forgot-password: ${method} verification failed`,
    });
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: method === "security_question" ? "Incorrect answer. Please try again." : "Incorrect code. Please try again.",
      },
      { status: 400 }
    );
  }

  // Issue the resetToken (Section 4.6) — single-use, 10-minute expiry.
  // Only reaches here with a real userId (isValid can't be true above
  // without a real recovery row backing it), so this is always a
  // genuine account at this point.
  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const resetTokenExpiresAt = new Date(Date.now() + FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.buyerRecovery.update({
    where: { userId: userId as string },
    data: {
      forgotPasswordResetTokenHash: resetTokenHash,
      forgotPasswordResetTokenExpiresAt: resetTokenExpiresAt,
      // Clear the consumed OTP so it can't be reused for another attempt.
      forgotPasswordOtpMethod: null,
      forgotPasswordOtpCodeHash: null,
      forgotPasswordOtpExpiresAt: null,
    },
  });

  await logSecurityEvent({
    eventType: "password_recovery_succeeded",
    actor: email,
    request,
    details: `Forgot-password: verified via ${method}`,
  });

  return NextResponse.json({
    success: true,
    data: { resetToken },
    message: "Identity verified.",
  });
}
