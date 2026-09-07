/**
 * FILE: lib/telegramLink.ts
 * PURPOSE:
 * Shared helpers for Step 2 of the recovery-setup wizard
 * (buyer_password_recovery_specification.md Section 2.2). Covers both
 * linking paths (2.2.1):
 *   - Deep-link path: a linkToken embedded in the
 *     https://t.me/<bot>?start=<linkToken> URL, matched by the bot
 *     webhook when Telegram calls it.
 *   - Manual fallback path: a 6-digit code the bot DMs back when a
 *     buyer opens the bot without the deep link.
 *
 * Both secrets are ephemeral and short-lived, so they follow the same
 * SHA-256 convention as lib/emailOtp.ts — not bcrypt, which is
 * reserved for long-lived credentials (passwords, security-question
 * answers, per Rule 18.2/32.4).
 */
import { createHash, randomBytes, randomInt } from "crypto";

export const TELEGRAM_LINK_TOKEN_EXPIRY_MINUTES = 10;
export const TELEGRAM_OTP_EXPIRY_MINUTES = 5;
export const TELEGRAM_OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * generateTelegramLinkToken
 * URL-safe random token embedded in the deep-link (?start=<token>).
 * Stored as-is (not hashed) since it's a one-time, short-lived
 * lookup key the webhook must match directly against the DB — same
 * reasoning as a password-reset token, not a password.
 */
export function generateTelegramLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * buildTelegramDeepLink
 * Builds the "Open Telegram" button URL shown in the UI (Section 2.2).
 * Returns null if TELEGRAM_BOT_USERNAME hasn't been configured yet —
 * callers must fall back to showing manual-search instructions only.
 */
export function buildTelegramDeepLink(linkToken: string): string | null {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) return null;
  return `https://t.me/${botUsername}?start=${linkToken}`;
}

/**
 * generateTelegramOtpCode
 * Cryptographically-random 6-digit code, zero-padded — the manual
 * fallback code the bot DMs back (2.2.1).
 */
export function generateTelegramOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * hashTelegramOtpCode / telegramOtpCodeMatches
 * Same SHA-256 ephemeral-secret convention as lib/emailOtp.ts.
 */
export function hashTelegramOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function telegramOtpCodeMatches(submittedCode: string, storedHash: string): boolean {
  return hashTelegramOtpCode(submittedCode) === storedHash;
}
