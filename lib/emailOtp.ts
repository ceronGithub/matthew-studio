/**
 * FILE: lib/emailOtp.ts
 * PURPOSE:
 * Generates and verifies the 6-digit email OTP used by
 * /api/auth/recovery-setup/email (buyer_password_recovery_specification.md
 * Section 2.1). Hashed with SHA-256 before it ever touches the
 * database — same ephemeral-secret convention lib/vaultHelpers.ts
 * uses for ephemeral, short-lived codes (this is a 10-minute code,
 * not a long-lived credential like a password or security-question
 * answer, which use bcrypt instead — see lib/securityQuestions.ts's
 * caller in the security-question route).
 */
import { createHash, randomInt } from "crypto";

export const EMAIL_OTP_EXPIRY_MINUTES = 10;
export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * generateEmailOtpCode
 * Cryptographically-random 6-digit code, zero-padded (e.g. "004821").
 * Uses crypto.randomInt rather than Math.random — this is a security
 * code, not a UI id.
 */
export function generateEmailOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * hashEmailOtpCode
 * SHA-256 of the code — irreversible, but cheap to compute, which is
 * fine here since the code space (6 digits) is already small and the
 * code expires in 10 minutes; bcrypt's slow-hash cost buys nothing
 * extra for a value this short-lived.
 */
export function hashEmailOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * emailOtpCodeMatches
 * Constant-time-ish comparison isn't critical here (the code already
 * expires in 10 minutes and resend is rate-limited), so a plain hash
 * comparison is sufficient — re-hash the submitted code and compare
 * the resulting hex strings.
 */
export function emailOtpCodeMatches(submittedCode: string, storedHash: string): boolean {
  return hashEmailOtpCode(submittedCode) === storedHash;
}
