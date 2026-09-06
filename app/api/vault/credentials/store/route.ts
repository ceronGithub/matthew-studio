/**
 * FILE: app/api/vault/credentials/store/route.ts
 * PURPOSE:
 * Persists the hashed vault credentials to the VaultCredentials table
 * only AFTER the user confirms they have backed them up. This is called
 * after the user screenshots/copies the plaintext from task-30's
 * generate route.
 *
 * Only the SHA-256 hashes are stored — the plaintext is never persisted,
 * following the zero-plaintext discipline from vault_specification.md
 * Section 4.2. The hashes exist purely for an audit trail and recovery
 * confirmation logic (future feature — not part of task-30's scope).
 *
 * Logs a vault_credentials_generated security event (Rule 38) to
 * timestamp when the backup was confirmed, who created it, and from
 * what device/IP (for anomaly detection and audit trail).
 *
 * Per Rule 28 (API response shape), Rule 18 (input sanitization),
 * Rule 31.3 (Next.js route handlers), Rule 38 (security logging).
 */

export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { validateSlugActive, hashVaultCredentials } from "@/lib/vaultHelpers";
import { logSecurityEvent } from "@/lib/securityLog";
import { prisma } from "@/services/prisma";

interface StoreCredentialsRequest {
  sessionId: string;
  wordsHash: string;
  alphanumericHash: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StoreCredentialsRequest;
    const { sessionId, wordsHash, alphanumericHash } = body;

    // Input validation — all three fields required
    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Missing sessionId.",
        },
        { status: 400 }
      );
    }

    if (!wordsHash || wordsHash.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Missing wordsHash.",
        },
        { status: 400 }
      );
    }

    if (!alphanumericHash || alphanumericHash.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Missing alphanumericHash.",
        },
        { status: 400 }
      );
    }

    // Hashes should be 64 hex characters (SHA-256 output)
    const hashRegex = /^[a-f0-9]{64}$/i;
    if (!hashRegex.test(wordsHash)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Invalid wordsHash format.",
        },
        { status: 400 }
      );
    }

    if (!hashRegex.test(alphanumericHash)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Invalid alphanumericHash format.",
        },
        { status: 400 }
      );
    }

    // Validate the session is active
    const session = await validateSlugActive(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Session slug has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Create the VaultCredentials audit trail entry
    // expiresAt is metadata-only (not enforced server-side per spec)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.vaultCredentials.create({
      data: {
        userId: session.userId,
        adminSessionId: session.id,
        role: session.role,
        wordsHash,
        alphanumericHash,
        expiresAt,
      },
    });

    // Log security event: vault credentials were generated and backed up
    // Use sessionId as the actor to tie it to the admin session, not just the user
    await logSecurityEvent({
      eventType: "vault_credentials_generated",
      actor: session.userId,
      request,
      details: `Vault credentials generated and confirmed by ${session.role} (session: ${session.id.substring(0, 8)})`,
    });

    return NextResponse.json(
      {
        success: true,
        data: null,
        message: "Vault credentials recorded.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[vault/credentials/store] Error:", (error as Error).message);

    // Log the failure as a security event too (potential tampering/abuse)
    await logSecurityEvent({
      eventType: "vault_credentials_store_failed",
      request,
      details: (error as Error).message,
    }).catch(err => console.error("[vault/credentials/store] Failed to log error:", err.message));

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "An error occurred while storing credentials.",
      },
      { status: 500 }
    );
  }
}
