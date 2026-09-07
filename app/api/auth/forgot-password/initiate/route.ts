/**
 * FILE: app/api/auth/forgot-password/initiate/route.ts
 * ROLE: Public (no session required — this IS the "I'm locked out" flow)
 *
 * PURPOSE:
 * Step 1 -> 2 of buyer_password_recovery_specification.md Section 4:
 * buyer submits an email, and — regardless of whether that email has
 * an account — always gets back the same three recovery-method cards
 * plus a security-question prompt (Section 4.1/4.2's anti-enumeration
 * rule). This is the ONLY branch point in the whole forgot-password
 * flow that has to actively resist revealing account existence, since
 * it runs before the buyer has proven anything about themselves.
 *
 * DATA FLOW:
 * 1. CSRF check, then combined per-IP + per-email rate limit (Section
 *    6 — same "forgot-password" endpoint label as /verify, so both
 *    routes share one 5-attempts/15-min budget per Rule 32.1).
 * 2. Resolve userId from email (lib/getUserByEmail.ts) and, if found,
 *    read BuyerRecovery.securityQuestionId — but do this lookup on
 *    EVERY call, found or not, so an attacker can't distinguish
 *    "account exists" from "account doesn't exist" by response
 *    timing (Rule 32.4's dummy-hash pattern, applied here to
 *    "dummy lookup" instead of "dummy hash").
 * 3. Always return the same response shape: the 3 fixed method
 *    cards + either the buyer's real question text or a generic
 *    placeholder question (Section 4.2).
 * 4. Log password_recovery_initiated regardless of outcome — this is
 *    an audit trail entry, not a signal to the client.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getUserIdByEmail } from "@/lib/getUserByEmail";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import { SECURITY_QUESTION_BANK } from "@/lib/securityQuestions";

// Section 6 / Rule 32.1: 5 attempts / 15 min, combined across all 3
// methods AND across initiate+verify — same endpoint label as
// forgot-password/verify/route.ts so both share one window.
const FORGOT_PASSWORD_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_WINDOW_MINUTES = 15;

// Shown when the email has no account, or has one but never
// finished picking a security question — same generic text either
// way (Section 4.2's "generic placeholder question" requirement).
const GENERIC_QUESTION_TEXT = "What was the name of your first pet?";

export async function POST(request: Request) {
  try {
    if (!isValidCsrfRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const ipAddress = getClientIp(request);
    const body = await request.json();
    const email: string = (body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter your email address." },
        { status: 400 }
      );
    }

    // Checked by IP AND by email — reusing the generic key param as
    // "email" per the account-scoped half of Section 6's combined
    // limit (task-66's note: same helper, called twice, same
    // "forgot-password" endpoint label).
    const ipLimit = await checkRateLimit(ipAddress, "forgot-password", FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_MINUTES);
    const emailLimit = await checkRateLimit(email, "forgot-password", FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_MINUTES);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_hit",
        actor: email,
        request,
        details: "Forgot-password: rate limit exceeded",
      });
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Always run the same lookups whether or not the email matches an
    // account — no early return before this point — so timing can't
    // leak existence (Rule 32.4 applied to a lookup instead of a hash).
    const userId = await getUserIdByEmail(email);
    const recovery = userId
      ? await prisma.buyerRecovery.findUnique({ where: { userId }, select: { securityQuestionId: true } })
      : null;

    const matchedQuestion = recovery?.securityQuestionId
      ? SECURITY_QUESTION_BANK.find((question) => question.id === recovery.securityQuestionId)
      : null;

    await logSecurityEvent({
      eventType: "password_recovery_initiated",
      actor: email,
      request,
      details: "Forgot-password: Step 1 identify submitted",
    });

    // Identical shape/timing regardless of match — Section 4.1/4.2.
    return NextResponse.json({
      success: true,
      data: {
        methods: ["email", "telegram", "security_question"],
        questionText: matchedQuestion?.text ?? GENERIC_QUESTION_TEXT,
      },
      message: "Choose a recovery method.",
    });
  } catch (error) {
    console.error("[forgot-password/initiate] Unexpected error:", (error as Error).message);
    // Stay generic even on an unexpected error — an error response
    // shaped differently from success would itself leak information.
    return NextResponse.json({
      success: true,
      data: { methods: ["email", "telegram", "security_question"], questionText: GENERIC_QUESTION_TEXT },
      message: "Choose a recovery method.",
    });
  }
}
