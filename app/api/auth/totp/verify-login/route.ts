/**
 * FILE: app/api/auth/totp/verify-login/route.ts
 * ROLE: Public (no session cookie yet — authenticated by the pending
 * token from POST /api/auth/login, not by sb-access-token)
 *
 * PURPOSE:
 * task-47-api-totp-login-verify, part 3 of 6 for 2FA/TOTP
 * (super_admin_account_specification.md Section 9.1 / Section 12
 * Phase 1). The second half of the TOTP-enabled login flow:
 * app/api/auth/login/route.ts already confirmed the password and
 * issued a short-lived pending token instead of a session; this route
 * confirms the 6-digit authenticator code and, only on success, grants
 * the real session — via lib/loginSession.ts's shared helper, never a
 * second copy of the cookie-setting logic.
 *
 * DATA FLOW:
 * 1. CSRF check (Rule 32.2), then rate limit (Rule 32.1 — same 5/15min
 *    shape as login itself; this is the "existing lockout logic" the
 *    task spec calls out, not a new Gatekeeper strike category).
 * 2. Decrypt + validate the pendingToken (lib/pendingTotpLogin.ts) — a
 *    missing, tampered, wrong-key, or expired token is rejected with
 *    the same generic message as a wrong code (Rule 34.1 — never
 *    reveal which part failed).
 * 3. Re-confirm the credential is still enabled=true (it could have
 *    been disabled in the few minutes since the pending token was
 *    issued) and decrypt its secret (lib/totpCrypto.ts).
 * 4. Check the submitted code with otplib's verify() — same 30s
 *    epochTolerance as the enrollment route (task-47-api-totp-enroll)
 *    for consistent clock-drift handling.
 * 5. On failure: log totp_login_failed (counts toward the rate limit
 *    above, same as any other failed auth attempt) and return a
 *    generic 400.
 * 6. On success: stamp lastVerifiedAt, log totp_login_verified, and
 *    hand off to lib/loginSession.ts's createLoginSuccessResponse()
 *    using the Supabase session tokens carried inside the pending
 *    token — this is the ONLY point a session/cookies/Vault slug is
 *    granted for a TOTP-enabled account.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verify as verifyTotpToken } from "otplib";
import { prisma } from "@/services/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { decryptTotpSecret } from "@/lib/totpCrypto";
import { parsePendingTotpLoginToken } from "@/lib/pendingTotpLogin";
import { createLoginSuccessResponse } from "@/lib/loginSession";

const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_WINDOW_MINUTES = 15;

// Same message whether the token or the code was the actual problem —
// never reveal which one failed (Rule 34.1 / Rule 32.4's principle).
const GENERIC_FAILURE_MESSAGE = "Invalid or expired code. Please try again.";

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "totp-login-verify", VERIFY_MAX_ATTEMPTS, VERIFY_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const pendingToken: string = typeof body?.pendingToken === "string" ? body.pendingToken : "";
    const code: string = typeof body?.code === "string" ? body.code.trim() : "";

    if (!pendingToken || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter the 6-digit code from your authenticator app." },
        { status: 400 }
      );
    }

    const pending = parsePendingTotpLoginToken(pendingToken);
    if (!pending) {
      await logSecurityEvent({
        eventType: "totp_login_failed",
        actor: null,
        request,
        details: "Pending TOTP token was missing, invalid, tampered, or expired.",
      });
      return NextResponse.json({ success: false, data: null, message: GENERIC_FAILURE_MESSAGE }, { status: 400 });
    }

    // Re-confirm still enabled — it could have been disabled in the
    // few minutes between /login issuing this token and this request.
    const credential = await prisma.adminTotpCredential.findFirst({
      where: { userId: pending.userId, enabled: true },
    });

    if (!credential) {
      await logSecurityEvent({
        eventType: "totp_login_failed",
        actor: pending.email,
        request,
        details: "Pending TOTP login: credential no longer enabled.",
      });
      return NextResponse.json({ success: false, data: null, message: GENERIC_FAILURE_MESSAGE }, { status: 400 });
    }

    const secret = decryptTotpSecret(credential.secretEncrypted);
    // epochTolerance: 30s each way — same clock-drift allowance as
    // the enrollment route's handleVerify (task-47-api-totp-enroll).
    const { valid: isValid } = await verifyTotpToken({ token: code, secret, epochTolerance: 30 });

    if (!isValid) {
      await logSecurityEvent({
        eventType: "totp_login_failed",
        actor: pending.email,
        request,
        details: "Incorrect verification code during login.",
      });
      return NextResponse.json({ success: false, data: null, message: GENERIC_FAILURE_MESSAGE }, { status: 400 });
    }

    await prisma.adminTotpCredential.update({
      where: { id: credential.id },
      data: { lastVerifiedAt: new Date() },
    });

    await logSecurityEvent({
      eventType: "totp_login_verified",
      actor: pending.email,
      request,
      details: `TOTP code verified for ${pending.role} account; session granted.`,
    });

    // The ONLY point a session/cookies/Vault slug is granted for a
    // TOTP-enabled account — same helper the non-2FA path in
    // app/api/auth/login/route.ts calls, never a duplicate.
    return await createLoginSuccessResponse(
      { userId: pending.userId, email: pending.email, role: pending.role },
      {
        access_token: pending.sessionAccessToken,
        refresh_token: pending.sessionRefreshToken,
        expires_in: pending.sessionExpiresIn,
      },
      request,
      "Signed in successfully."
    );
  } catch (error) {
    console.error("[auth/totp/verify-login] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
