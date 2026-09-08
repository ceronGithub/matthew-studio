/**
 * FILE: lib/totpCrypto.ts
 * PURPOSE:
 * Encrypts and decrypts TOTP (RFC 6238) secrets for
 * AdminTotpCredential.secretEncrypted (task-47-schema-totp). Unlike
 * lib/vaultHelpers.ts's one-way SHA-256 hashing (Vault credentials are
 * only ever compared, never read back), a TOTP secret MUST be
 * recoverable — every login re-derives the current 6-digit code from
 * the stored secret, so this is reversible AES-256-GCM encryption, not
 * hashing.
 *
 * Server-side only. Never import this in a "use client" file — the
 * encryption key must never reach the browser bundle (Rule 18.5).
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // GCM standard nonce size
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * getEncryptionKey
 * Reads TOTP_ENCRYPTION_KEY from the environment — a 32-byte key,
 * base64-encoded. Throws loudly at call time rather than silently
 * falling back to a weaker default, since a missing key here would
 * otherwise fail in a way that's hard to notice until someone tries
 * to log in with TOTP enabled.
 */
function getEncryptionKey(): Buffer {
  const base64Key = process.env.TOTP_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).");
  }

  return key;
}

/**
 * encryptTotpSecret
 * Encrypts a raw TOTP secret for storage in
 * AdminTotpCredential.secretEncrypted. Output packs iv + authTag +
 * ciphertext into one base64 string so the column stays a single
 * String field — no separate columns needed for the nonce/tag.
 *
 * @param plaintextSecret - the raw base32 TOTP secret (from otplib)
 */
export function encryptTotpSecret(plaintextSecret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintextSecret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack as iv | authTag | ciphertext, then base64 the whole thing
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * decryptTotpSecret
 * Reverses encryptTotpSecret — called on every login/verification
 * attempt to recover the raw secret so otplib can check the submitted
 * 6-digit code against it.
 *
 * @param packedCiphertext - the base64 string stored in secretEncrypted
 */
export function decryptTotpSecret(packedCiphertext: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(packedCiphertext, "base64");

  const iv = packed.subarray(0, IV_LENGTH_BYTES);
  const authTag = packed.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = packed.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
