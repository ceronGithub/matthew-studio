/**
 * FILE: app/api/auth/recovery-setup/security-question/route.ts
 * ROLE: Buyer (must be logged in — checked via getSessionUserId)
 *
 * PURPOSE:
 * Step 3 of the mandatory post-registration recovery setup
 * (buyer_password_recovery_specification.md Section 2.3 / 5). Saves
 * the buyer's chosen question + answer. The answer is bcrypt-hashed —
 * same discipline as passwords (Rule 18.2/32.4) — never stored or
 * logged in plaintext. Compared case-insensitively at verification
 * time (Section 4.5, a separate task), so it's lowercased/trimmed
 * before hashing here too, so a later compare with the same
 * normalization actually matches.
 *
 * This is also the last of the 3 setup steps (email, then telegram,
 * then security question, per Section 2), so after saving here it
 * checks whether all 3 are now confirmed server-side and, if so,
 * flips recoverySetupComplete = true (task-41) — never on the
 * client's say-so alone, since RecoverySetupWizard.tsx's step
 * progression is only a UI convenience, not proof of completion.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { isValidSecurityQuestionId } from "@/lib/securityQuestions";

const BCRYPT_SALT_ROUNDS = 12;
const SETUP_MAX_ATTEMPTS = 5;
const SETUP_WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, message: "Please sign in again to continue." },
        { status: 401 }
      );
    }

    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(
      ipAddress,
      "recovery-setup-security-question",
      SETUP_MAX_ATTEMPTS,
      SETUP_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const questionId: string = body.questionId ?? "";
    // Normalize before hashing — same lowercase/trim discipline the
    // Section 4.5 verify step must apply, so the two sides can match.
    const answer: string = (body.answer ?? "").trim().toLowerCase();

    if (!isValidSecurityQuestionId(questionId)) {
      return NextResponse.json(
        { success: false, data: null, message: "Please choose a valid security question.", error: "Validation failed" },
        { status: 400 }
      );
    }
    if (answer.length < 2) {
      return NextResponse.json(
        { success: false, data: null, message: "Your answer must be at least 2 characters.", error: "Validation failed" },
        { status: 400 }
      );
    }

    const answerHash = await bcrypt.hash(answer, BCRYPT_SALT_ROUNDS);

    // Upsert: the buyer's BuyerRecovery row may already exist from the
    // email-OTP and/or Telegram steps, or this may be the first step
    // to touch it. Read the existing row's other two steps first so
    // the completeness check below reflects state as of right now,
    // not a stale value from before this request.
    const existing = await prisma.buyerRecovery.findUnique({
      where: { userId },
      select: { emailVerifiedForRecovery: true, telegramChatId: true },
    });

    // All 3 steps confirmed server-side: email verified, a Telegram
    // chat linked, and this security-question save succeeding right
    // now. Never trust the wizard's client-side step index — only the
    // server-persisted fields count (Section 2's own requirement).
    const allStepsComplete = Boolean(existing?.emailVerifiedForRecovery) && Boolean(existing?.telegramChatId);

    const recovery = await prisma.buyerRecovery.upsert({
      where: { userId },
      create: {
        userId,
        securityQuestionId: questionId,
        securityAnswerHash: answerHash,
        recoverySetupComplete: allStepsComplete,
      },
      update: {
        securityQuestionId: questionId,
        securityAnswerHash: answerHash,
        recoverySetupComplete: allStepsComplete,
      },
    });

    await logSecurityEvent({
      eventType: "recovery_setup_security_question_saved",
      actor: userId,
      request,
      details: "Recovery setup: security question saved",
    });

    // Log completion as its own event — separate from the per-step
    // save above — so the Security Logs page (Rule 38.9) can show
    // "recovery setup finished" as a distinct, filterable milestone
    // rather than inferring it from the security-question event alone.
    if (recovery.recoverySetupComplete) {
      await logSecurityEvent({
        eventType: "recovery_setup_completed",
        actor: userId,
        request,
        details: "Recovery setup: all 3 steps confirmed, recoverySetupComplete = true",
      });
    }

    return NextResponse.json({
      success: true,
      data: { securityQuestionSaved: true, recoverySetupComplete: recovery.recoverySetupComplete },
      message: "Security question saved.",
    });
  } catch (error) {
    console.error("[recovery-setup/security-question] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
