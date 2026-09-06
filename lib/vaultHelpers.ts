/**
 * FILE: lib/vaultHelpers.ts
 * PURPOSE:
 * Composes the raw generators from lib/slugGenerator.ts into the
 * actual Vault shapes defined in vault_specification.md, and provides
 * the two DB-touching helpers the login/logout routes need
 * (validateSlugActive, expireAdminSessions). Persisting a NEW
 * AdminSession row on login is left to the login route itself
 * (task-29) — this file only generates the slug content and validates/
 * expires existing rows, per Section 9's own Utility Functions vs.
 * API Routes split.
 *
 * Vault credentials (Section 3.1) are deliberately generated here but
 * NEVER persisted in plaintext anywhere — only their SHA-256 hashes
 * (Section 4.2/8.2) are ever written to VaultCredentials, and that
 * write itself happens in the API route (task-30), not here.
 */
import { prisma } from "@/services/prisma";
import { createHash } from "crypto";
import { generateWords, generateAlphanumeric, generateAlphaspecial } from "@/lib/slugGenerator";
import type { AdminSession } from "@prisma/client";

/** Session slugs are valid for 24 hours from login (Section 4.1). */
const SLUG_EXPIRY_HOURS = 24;
/** Vault credentials are valid for 24 hours from generation (Section 3.1/4.2). Metadata only — not enforced server-side. */
const VAULT_CREDENTIALS_EXPIRY_HOURS = 24;

export interface SuperAdminSlug {
  words: string[]; // 12
  alphanumeric: string; // 12
  alphaspecial: string; // 12
}

export interface AdminSlug {
  alphanumeric: string; // 7
  alphaspecial: string; // 7
  words: string[]; // 7
}

export interface VaultCredentials {
  words: string[]; // 15
  alphanumeric: string; // 15
  generatedAt: string; // ISO
  expiresAt: string; // ISO, metadata only
}

/**
 * generateSuperAdminSlug
 * Builds the 36-component super-admin slug (12 words + 12
 * alphanumeric + 12 alphaspecial) per Section 2.2. Pure function —
 * does not touch the database.
 */
export function generateSuperAdminSlug(): SuperAdminSlug {
  return {
    words: generateWords(12),
    alphanumeric: generateAlphanumeric(12),
    alphaspecial: generateAlphaspecial(12),
  };
}

/**
 * generateAdminSlug
 * Builds the 21-component admin slug (7 alphanumeric + 7 alphaspecial
 * + 7 words) per Section 2.3. Field order matches the spec's own
 * storage example for the admin shape. Pure function — does not
 * touch the database.
 */
export function generateAdminSlug(): AdminSlug {
  return {
    alphanumeric: generateAlphanumeric(7),
    alphaspecial: generateAlphaspecial(7),
    words: generateWords(7),
  };
}

/**
 * generateSlugForRole
 * Dispatches to the correct generator by role, and returns the
 * expiresAt timestamp alongside it so the login route (task-29) has
 * everything it needs to create the AdminSession row in one call.
 */
export function generateSlugForRole(role: "superAdmin" | "admin"): {
  slug: SuperAdminSlug | AdminSlug;
  expiresAt: Date;
} {
  const slug = role === "superAdmin" ? generateSuperAdminSlug() : generateAdminSlug();
  const expiresAt = new Date(Date.now() + SLUG_EXPIRY_HOURS * 60 * 60 * 1000);
  return { slug, expiresAt };
}

/**
 * validateSlugActive
 * Looks up an AdminSession by id and confirms it is both marked
 * active AND not past its expiry — a session can be `isActive: true`
 * in the row but still time-barred if `expiresAt` has passed.
 * Returns the session row when valid, otherwise null. Never throws —
 * a lookup failure is treated the same as "not valid" (fail closed,
 * unlike Gatekeeper's fail-open convention, since this guards the
 * Vault page itself rather than general site access).
 */
export async function validateSlugActive(sessionId: string): Promise<AdminSession | null> {
  try {
    const session = await prisma.adminSession.findUnique({ where: { id: sessionId } });
    if (!session) return null;
    if (!session.isActive) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    return session;
  } catch (error) {
    console.error("[vaultHelpers] validateSlugActive failed:", (error as Error).message);
    return null;
  }
}

/**
 * expireAdminSessions
 * Marks every currently-active AdminSession row for this user as
 * inactive (isActive: false, signedOutAt: now). Called on sign-out so
 * the next login always generates a brand-new slug — old slugs are
 * never reactivated (Section 2.1's "NEXT LOGIN" lifecycle step).
 */
export async function expireAdminSessions(userId: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, signedOutAt: new Date() },
  });
}

/**
 * generateVaultCredentials
 * Builds the 30-component emergency-access credentials (15 words + 15
 * alphanumeric) per Section 3.1. Deliberately returns the plaintext
 * values — the caller (the vault page / its API route) displays them
 * exactly once and must never persist this return value anywhere.
 * Only hashVaultCredentials()'s output ever reaches the database.
 */
export function generateVaultCredentials(): VaultCredentials {
  const now = new Date();
  return {
    words: generateWords(15),
    alphanumeric: generateAlphanumeric(15),
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + VAULT_CREDENTIALS_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * hashVaultCredentials
 * SHA-256 hashes the words (joined with a space, matching how they'd
 * be read back by a human) and the alphanumeric string separately, so
 * VaultCredentials (Section 4.2) can store an audit-trail hash
 * without ever persisting the plaintext emergency codes.
 */
export function hashVaultCredentials(
  words: string[],
  alphanumeric: string
): { wordsHash: string; alphanumericHash: string } {
  return {
    wordsHash: createHash("sha256").update(words.join(" ")).digest("hex"),
    alphanumericHash: createHash("sha256").update(alphanumeric).digest("hex"),
  };
}
