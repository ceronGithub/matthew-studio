/**
 * FILE: lib/passwordResetToken.ts
 * PURPOSE:
 * Shared helpers for Section 4 (FORGOT PASSWORD FLOW) of
 * buyer_password_recovery_specification.md — task-66 (schema + lib
 * half). Two distinct secrets, both SHA-256 ephemeral-secret
 * convention (lib/emailOtp.ts, lib/telegramLink.ts):
 *
 *   1. The Step 3 OTP code (Section 4.3/4.4) — a 6-digit code sent to
 *      whichever channel (email or telegram) the buyer picked at
 *      Step 2. Same shape as the Section 2 setup codes, but stored in
 *      forgotPasswordOtpCodeHash — a separate field so an in-flight
 *      recovery attempt can never be confused with (or race) an
 *      unrelated Section 2 setup/re-link flow.
 *
 *   2. The resetToken (Section 4.6) issued once Step 3 succeeds,
 *      embedded in /auth/reset-password?token=. Unlike
 *      lib/telegramLink.ts's linkToken (stored raw, matched directly
 *      by a Telegram webhook it doesn't control), this token alone
 *      is enough to change the buyer's password, so it is hashed
 *      before storage — a DB leak must not hand out a directly
 *      usable reset link, same reasoning Rule 18.2/32.4 applies to
 *      passwords themselves, just with a fast hash since the token
 *      is already high-entropy and short-lived (10 minutes).
 */
import { createHash, randomBytes, randomInt } from "crypto";

export const FORGOT_PASSWORD_OTP_EXPIRY_MINUTES = 5;
export const FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const FORGOT_PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 10;

/**
 * generateForgotPasswordOtpCode
 * Cryptographically-random 6-digit code, zero-padded — sent via
 * whichever channel (EmailJS or the Telegram bot) the buyer picked.
 */
export function generateForgotPasswordOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashForgotPasswordOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function forgotPasswordOtpCodeMatches(submittedCode: string, storedHash: string): boolean {
  return hashForgotPasswordOtpCode(submittedCode) === storedHash;
}

/**
 * generateResetToken
 * URL-safe, high-entropy random token for the /auth/reset-password
 * link. Generated raw (this is what's emailed/shown/embedded in the
 * URL) — only the HASH of this value is ever persisted, via
 * hashResetToken below.
 */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenMatches(submittedToken: string, storedHash: string): boolean {
  return hashResetToken(submittedToken) === storedHash;
}
