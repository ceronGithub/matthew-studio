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
    // email-OTP step, or this may be the first step to touch it.
    await prisma.buyerRecovery.upsert({
      where: { userId },
      create: { userId, securityQuestionId: questionId, securityAnswerHash: answerHash },
      update: { securityQuestionId: questionId, securityAnswerHash: answerHash },
    });

    await logSecurityEvent({
      eventType: "recovery_setup_security_question_saved",
      actor: userId,
      request,
      details: "Recovery setup: security question saved",
    });

    return NextResponse.json({
      success: true,
      data: { securityQuestionSaved: true },
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
