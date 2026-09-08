/**
 * FILE: app/api/auth/totp/enroll/route.ts
 * ROLE: admin | superAdmin (must be logged in — checked via getSessionAdmin)
 *
 * PURPOSE:
 * task-47-api-totp-enroll, part 2 of 6 for 2FA/TOTP enrollment
 * (super_admin_account_specification.md Section 9.1 / Section 12
 * Phase 1). Handles the enrollment half of TOTP — issuing a new
 * secret + QR code, and confirming enrollment with a verification
 * code. The login-time TOTP gate itself is a separate task
 * (task-47-api-totp-login-verify), not built here.
 *
 * Three actions from a single endpoint, mirroring the recovery-setup
 * routes' shape (app/api/auth/recovery-setup/*):
 *   - GET (no body)                    → current enrollment status
 *   - POST { action: "generate" }      → issue a new secret + QR code
 *   - POST { action: "verify", code }  → confirm the code, flip enabled
 *
 * DATA FLOW:
 * 1. Resolve the calling admin/superAdmin from the sb-access-token cookie
 * 2. "generate": refuse if already enabled; otherwise clear any stale
 *    unverified attempt for this user, generate a fresh otplib secret,
 *    encrypt it (lib/totpCrypto.ts) and store as an AdminTotpCredential
 *    row with enabled=false, return the otpauth URI + a QR code data URL
 * 3. "verify": decrypt the most recent unverified credential's secret,
 *    check the submitted 6-digit code with otplib, and on success flip
 *    enabled=true / stamp enrolledAt + lastVerifiedAt
 * 4. Every attempt (initiated, completed, failed) is logged to
 *    SecurityLog — this is the setup flow, informational only, same
 *    as the recovery-setup routes (no Gatekeeper strike wiring here)
 *
 * NOTE — otplib v13: the old `authenticator` singleton object (v12
 * API) was removed. This file uses the current standalone functional
 * API (`generateSecret`, `generateURI`, `verify`) instead — `verify`
 * is async and returns `{ valid, delta }`, not a plain boolean.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateSecret, generateURI, verify as verifyTotpToken } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/services/prisma";
import { getSessionAdmin } from "@/lib/getSessionAdmin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { encryptTotpSecret, decryptTotpSecret } from "@/lib/totpCrypto";

const TOTP_ISSUER = "Matthew Studio";
const ENROLL_MAX_ATTEMPTS = 5;
const ENROLL_WINDOW_MINUTES = 15;

/**
 * GET /api/auth/totp/enroll
 * Reports whether the calling account already has TOTP enabled — used
 * by the enrollment screen to decide whether to show the QR step or a
 * "2FA is already on" state, and later by task-47-totp-setup-gate's
 * middleware check.
 */
export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Please sign in again to continue." },
        { status: 401 }
      );
    }

    const credential = await prisma.adminTotpCredential.findFirst({
      where: { userId: admin.id, enabled: true },
      select: { enrolledAt: true, lastVerifiedAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          enabled: Boolean(credential),
          enrolledAt: credential?.enrolledAt ?? null,
          lastVerifiedAt: credential?.lastVerifiedAt ?? null,
        },
        message: "TOTP status retrieved.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/totp/enroll GET] Error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const admin = await getSessionAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, data: null, message: "Please sign in again to continue." },
        { status: 401 }
      );
    }

    const ipAddress = getClientIp(request);
    // Combined budget across generate+verify, same "5 / 15 min"
    // priority-endpoint shape as Rule 32.1 and the recovery-setup routes.
    const rateLimit = await checkRateLimit(ipAddress, "totp-enroll", ENROLL_MAX_ATTEMPTS, ENROLL_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action: string = body?.action ?? "";

    if (action === "generate") {
      return await handleGenerate(request, admin);
    }

    if (action === "verify") {
      return await handleVerify(request, admin, body?.code);
    }

    return NextResponse.json(
      { success: false, data: null, message: "Invalid action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[auth/totp/enroll POST] Error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * handleGenerate
 * Issues a fresh TOTP secret for the calling account. Refuses if 2FA
 * is already active — an admin who wants to rotate their secret must
 * go through a separate "disable" step first (not part of this task),
 * so a stolen session token alone can't silently swap out a working
 * 2FA credential for one only the attacker knows.
 */
async function handleGenerate(
  request: Request,
  admin: { id: string; email: string | null; role: "admin" | "superAdmin" }
) {
  const alreadyEnabled = await prisma.adminTotpCredential.findFirst({
    where: { userId: admin.id, enabled: true },
  });

  if (alreadyEnabled) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Two-factor authentication is already enabled on this account.",
      },
      { status: 409 }
    );
  }

  // Clear out any stale, never-verified enrollment attempts for this
  // user before issuing a new one — prevents orphaned rows piling up
  // every time someone reloads the enrollment screen.
  await prisma.adminTotpCredential.deleteMany({
    where: { userId: admin.id, enabled: false },
  });

  const secret = generateSecret();
  const otpauthUri = generateURI({
    issuer: TOTP_ISSUER,
    label: admin.email ?? admin.id,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  await prisma.adminTotpCredential.create({
    data: {
      userId: admin.id,
      role: admin.role,
      secretEncrypted: encryptTotpSecret(secret),
      enabled: false,
    },
  });

  await logSecurityEvent({
    eventType: "totp_enrollment_initiated",
    actor: admin.email ?? admin.id,
    request,
    details: `TOTP enrollment started for ${admin.role} account.`,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        secret,
        otpauthUri,
        qrCodeDataUrl,
      },
      message: "Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.",
    },
    { status: 200 }
  );
}

/**
 * handleVerify
 * Confirms the code the admin typed in against the most recent
 * not-yet-enabled credential row, and activates it on success. This
 * is the ONLY place enabled ever flips to true — the login-time check
 * (task-47-api-totp-login-verify) only ever reads it.
 */
async function handleVerify(
  request: Request,
  admin: { id: string; email: string | null; role: "admin" | "superAdmin" },
  rawCode: unknown
) {
  const code = typeof rawCode === "string" ? rawCode.trim() : "";

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, data: null, message: "Enter the 6-digit code from your authenticator app." },
      { status: 400 }
    );
  }

  const pending = await prisma.adminTotpCredential.findFirst({
    where: { userId: admin.id, enabled: false },
    orderBy: { createdAt: "desc" },
  });

  if (!pending) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "No pending enrollment found. Please generate a new QR code first.",
      },
      { status: 400 }
    );
  }

  const secret = decryptTotpSecret(pending.secretEncrypted);
  // epochTolerance: 30s each way — accepts the previous/next 30-second
  // step so small clock drift between the admin's phone and the server
  // doesn't cause a false rejection, same tolerance otplib v12's
  // default `window: 1` gave us.
  const { valid: isValid } = await verifyTotpToken({ token: code, secret, epochTolerance: 30 });

  if (!isValid) {
    await logSecurityEvent({
      eventType: "totp_enrollment_failed",
      actor: admin.email ?? admin.id,
      request,
      details: "Incorrect verification code during TOTP enrollment.",
    });

    return NextResponse.json(
      { success: false, data: null, message: "Invalid code. Please try again." },
      { status: 400 }
    );
  }

  const now = new Date();
  await prisma.adminTotpCredential.update({
    where: { id: pending.id },
    data: { enabled: true, enrolledAt: now, lastVerifiedAt: now },
  });

  await logSecurityEvent({
    eventType: "totp_enrollment_completed",
    actor: admin.email ?? admin.id,
    request,
    details: `TOTP enabled for ${admin.role} account.`,
  });

  return NextResponse.json(
    { success: true, data: { enabled: true, enrolledAt: now }, message: "Two-factor authentication enabled." },
    { status: 200 }
  );
}
