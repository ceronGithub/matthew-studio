/**
 * FILE: lib/clientHash.ts
 * PURPOSE:
 * Browser-only SHA-256 hashing for the Vault credentials confirmation
 * flow. Mirrors lib/vaultHelpers.ts's hashVaultCredentials() exactly
 * (words joined with a single space, alphanumeric as-is) but uses the
 * Web Crypto API's crypto.subtle instead of Node's "crypto" module,
 * since this runs in a "use client" component, not on the server.
 *
 * Per vault_specification.md Section 8.2: plaintext credentials must
 * never be persisted anywhere, including in a network request body
 * bound for storage — only the hash crosses the wire to
 * /api/vault/credentials/store.
 */
"use client";

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digestBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * hashVaultCredentialsClient
 * Produces the same { wordsHash, alphanumericHash } shape the store
 * route expects, computed entirely in the browser so the plaintext
 * never needs a second server round-trip just to be hashed.
 */
export async function hashVaultCredentialsClient(
  words: string[],
  alphanumeric: string
): Promise<{ wordsHash: string; alphanumericHash: string }> {
  const [wordsHash, alphanumericHash] = await Promise.all([
    sha256Hex(words.join(" ")),
    sha256Hex(alphanumeric),
  ]);
  return { wordsHash, alphanumericHash };
}
