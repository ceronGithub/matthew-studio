/**
 * FILE: lib/pendingTotpLogin.ts
 * PURPOSE:
 * Issues and validates the short-lived "pending TOTP login" token for
 * task-47-api-totp-login-verify (super_admin_account_specification.md
 * Section 9.1). When an admin/superAdmin with TOTP already enabled
 * passes password auth, app/api/auth/login/route.ts must NOT grant a
 * real session yet — but it also can't throw away the Supabase session
 * it just received from signInWithPassword(), since that session
 * cannot be re-issued later without the password. This file packs that
 * session (access token, refresh token, expiry) plus the account's
 * identity into one opaque, encrypted, short-expiry token that the
 * client holds only long enough to submit the 6-digit code to
 * POST /api/auth/totp/verify-login.
 *
 * Self-contained (no DB row) by design — nothing here needs a new
 * Prisma model or migration:
 *   - AES-256-GCM (same primitive as lib/totpCrypto.ts) gives both
 *     confidentiality (the session tokens inside are unreadable
 *     without the server's key) and integrity (the auth tag makes any
 *     tampering fail decryption outright — no separate signature
 *     needed).
 *   - A distinct PENDING_TOTP_LOGIN_KEY (never TOTP_ENCRYPTION_KEY) is
 *     used deliberately — key separation between "this recovers a
 *     TOTP secret forever" and "this recovers one session for five
 *     minutes" so a leak of one key doesn't also expose the other.
 *   - A 5-minute expiresAt is embedded in the encrypted payload itself
 *     and checked on every parse — an expired token is rejected the
 *     same way a corrupt/forged one is, before its contents are ever
 *     trusted.
 *
 * Server-side only. Never import this in a "use client" file — the
 * encryption key must never reach the browser bundle (Rule 18.5).
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const PENDING_TOTP_LOGIN_EXPIRY_MINUTES = 5;

export interface PendingTotpLoginInput {
  userId: string;
  email: string | null;
  role: "admin" | "superAdmin";
  sessionAccessToken: string;
  sessionRefreshToken: string;
  sessionExpiresIn: number;
}

export interface PendingTotpLoginPayload extends PendingTotpLoginInput {
  expiresAt: number; // ms epoch — this pending token's own expiry, not the session's
}

/**
 * getEncryptionKey
 * Reads PENDING_TOTP_LOGIN_KEY from the environment — a 32-byte key,
 * base64-encoded. Throws loudly at call time rather than silently
 * falling back to a weaker default, matching lib/totpCrypto.ts's
 * convention for the same class of key.
 */
function getEncryptionKey(): Buffer {
  const base64Key = process.env.PENDING_TOTP_LOGIN_KEY;
  if (!base64Key) {
    throw new Error(
      "PENDING_TOTP_LOGIN_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("PENDING_TOTP_LOGIN_KEY must decode to exactly 32 bytes (AES-256).");
  }

  return key;
}

/**
 * createPendingTotpLoginToken
 * Encrypts the account identity + in-flight Supabase session into one
 * opaque, base64 string. Stamps its own 5-minute expiresAt — the
 * caller never supplies this, so a token can't be minted with a longer
 * lifetime by mistake.
 */
export function createPendingTotpLoginToken(input: PendingTotpLoginInput): string {
  const payload: PendingTotpLoginPayload = {
    ...input,
    expiresAt: Date.now() + PENDING_TOTP_LOGIN_EXPIRY_MINUTES * 60 * 1000,
  };

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack as iv | authTag | ciphertext, then base64 the whole thing —
  // same shape as lib/totpCrypto.ts's encryptTotpSecret.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * parsePendingTotpLoginToken
 * Reverses createPendingTotpLoginToken and checks expiry. Never
 * throws — a malformed, tampered, wrong-key, or expired token all
 * simply return null, so app/api/auth/totp/verify-login/route.ts can
 * treat every failure mode the same generic way (Rule 34.1) without
 * needing its own try/catch around this call.
 */
export function parsePendingTotpLoginToken(token: string): PendingTotpLoginPayload | null {
  try {
    const key = getEncryptionKey();
    const packed = Buffer.from(token, "base64");

    const iv = packed.subarray(0, IV_LENGTH_BYTES);
    const authTag = packed.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const ciphertext = packed.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as PendingTotpLoginPayload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.sessionAccessToken !== "string" ||
      typeof payload.sessionRefreshToken !== "string" ||
      typeof payload.sessionExpiresIn !== "number" ||
      typeof payload.expiresAt !== "number" ||
      (payload.role !== "admin" && payload.role !== "superAdmin")
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
