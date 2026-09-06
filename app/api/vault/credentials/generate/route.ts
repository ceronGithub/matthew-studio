/**
 * FILE: app/api/vault/credentials/generate/route.ts
 * PURPOSE:
 * Generates ephemeral vault credentials (15 BIP39 words + 15 alphanumeric
 * chars) and returns them to the client for immediate display and
 * screenshot. The plaintext values are NEVER persisted — only their
 * SHA-256 hashes are stored by the subsequent task-30's store route.
 *
 * This separates the generation (happens on-demand) from the storage
 * (happens only after the user confirms they've backed up the codes),
 * preventing accidental DB pollution from incomplete backup workflows.
 *
 * Per Rule 28 (API response shape), Rule 18 (input sanitization),
 * Rule 31.3 (Next.js route handlers), and Rule 38 (security logging
 * at store time, not here — this is ephemeral).
 */

export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { validateSlugActive } from "@/lib/vaultHelpers";
import { generateVaultCredentials } from "@/lib/vaultHelpers";

interface GenerateCredentialsRequest {
  sessionId: string;
  role: "superAdmin" | "admin";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateCredentialsRequest;
    const { sessionId, role } = body;

    // Input validation
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

    if (!role || !["superAdmin", "admin"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Invalid or missing role.",
        },
        { status: 400 }
      );
    }

    // Validate the session slug is active
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

    // Verify the caller's role matches what they're requesting (no cross-role generation)
    if (session.role !== role) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Role mismatch. Cannot generate credentials for a different role.",
        },
        { status: 403 }
      );
    }

    // Generate ephemeral credentials (NOT stored, only returned to client)
    const credentials = generateVaultCredentials();

    return NextResponse.json(
      {
        success: true,
        data: {
          words: credentials.words,
          alphanumeric: credentials.alphanumeric,
          generatedAt: credentials.generatedAt,
          expiresAt: credentials.expiresAt,
          warning:
            "⚠️ These credentials exist only on this screen. Copy or screenshot immediately. They will not be available after you close this page.",
        },
        message: "Vault credentials generated.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[vault/credentials/generate] Error:", (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "An error occurred while generating credentials.",
      },
      { status: 500 }
    );
  }
}
