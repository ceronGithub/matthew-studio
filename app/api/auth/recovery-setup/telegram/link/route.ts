/**
 * FILE: app/api/auth/recovery-setup/telegram/link/route.ts
 * ROLE: Buyer (must be logged in — checked via getSessionUserId)
 *
 * PURPOSE:
 * Step 2 of the mandatory post-registration recovery setup
 * (buyer_password_recovery_specification.md Section 2.2 / 5). Three
 * actions from a single endpoint, mirroring the email route's shape:
 *   - { action: "start" }              → generate a linkToken, return
 *                                         the deep-link URL for the
 *                                         "Open Telegram" button
 *   - { action: "status" }             → poll: has the deep-link path
 *                                         completed linking yet?
 *   - { action: "verify-code", code }  → manual-fallback path: claim
 *                                         a TelegramPendingLink row
 *                                         created by the webhook
 *
 * DATA FLOW:
 * 1. Resolve the calling buyer's userId
 * 2. "start": generate + store telegramLinkToken (10-min expiry),
 *    build the deep link via lib/telegramLink.ts
 * 3. "status": read back whether telegramChatId is now set (the
 *    webhook — a separate request from Telegram's servers — is what
 *    actually sets it; this route only reports the current state)
 * 4. "verify-code": hash the submitted code, look up the matching
 *    TelegramPendingLink, and if found + unexpired, copy its chatId
 *    onto this buyer's BuyerRecovery row and delete the pending row
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getSessionUserId } from "@/lib/getSessionUserId";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";
import { isValidCsrfRequest } from "@/lib/csrf";
import {
  generateTelegramLinkToken,
  buildTelegramDeepLink,
  telegramOtpCodeMatches,
  TELEGRAM_LINK_TOKEN_EXPIRY_MINUTES,
} from "@/lib/telegramLink";

const TELEGRAM_LINK_MAX_ATTEMPTS = 5;
const TELEGRAM_LINK_WINDOW_MINUTES = 15;

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
    // Combined rate limit across all three actions on this endpoint —
    // same "5 attempts / 15 min" priority-endpoint budget as Rule 32.1.
    const rateLimit = await checkRateLimit(
      ipAddress,
      "recovery-setup-telegram",
      TELEGRAM_LINK_MAX_ATTEMPTS,
      TELEGRAM_LINK_WINDOW_MINUTES
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action: string = body.action ?? "";

    if (action === "start") {
      const linkToken = generateTelegramLinkToken();
      const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await prisma.buyerRecovery.upsert({
        where: { userId },
        create: { userId, telegramLinkToken: linkToken, telegramLinkTokenExpiresAt: expiresAt },
        update: { telegramLinkToken: linkToken, telegramLinkTokenExpiresAt: expiresAt },
      });

      const deepLink = buildTelegramDeepLink(linkToken);

      return NextResponse.json({
        success: true,
        data: { deepLink, botConfigured: deepLink !== null },
        message: deepLink ? "Deep link generated." : "Telegram bot is not configured yet.",
      });
    }

    if (action === "status") {
      const recovery = await prisma.buyerRecovery.findUnique({ where: { userId } });

      return NextResponse.json({
        success: true,
        data: { telegramLinked: Boolean(recovery?.telegramChatId) },
        message: recovery?.telegramChatId ? "Telegram linked." : "Not linked yet.",
      });
    }

    if (action === "verify-code") {
      const submittedCode: string = (body.code ?? "").trim();

      // Fetch every still-valid pending link and compare hashes — the
      // code space is small enough (6 digits, 5-min expiry) that a
      // short table scan here is fine, and it avoids needing the raw
      // code as a lookup key (only the hash is ever stored).
      const pendingLinks = await prisma.telegramPendingLink.findMany({
        where: { expiresAt: { gt: new Date() } },
      });
      const matchedPending = pendingLinks.find((pending: { codeHash: string }) =>
        telegramOtpCodeMatches(submittedCode, pending.codeHash)
      );

      if (!matchedPending) {
        await logSecurityEvent({
          eventType: "recovery_setup_telegram_otp_failed",
          actor: userId,
          request,
          details: "Recovery setup: wrong or expired Telegram code",
        });
        return NextResponse.json(
          { success: false, data: null, message: "Incorrect or expired code. Please try again." },
          { status: 400 }
        );
      }

      // Claim it: this chat_id now belongs to this buyer. Guard
      // against the (rare) case where this chat_id was already linked
      // to a different buyer account via @@unique — reject cleanly
      // rather than throwing a raw Prisma constraint error.
      const alreadyLinkedElsewhere = await prisma.buyerRecovery.findUnique({
        where: { telegramChatId: matchedPending.chatId },
      });
      if (alreadyLinkedElsewhere && alreadyLinkedElsewhere.userId !== userId) {
        return NextResponse.json(
          { success: false, data: null, message: "This Telegram account is already linked to another user." },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.buyerRecovery.upsert({
          where: { userId },
          create: { userId, telegramChatId: matchedPending.chatId, telegramLinkedAt: new Date() },
          update: { telegramChatId: matchedPending.chatId, telegramLinkedAt: new Date() },
        }),
        prisma.telegramPendingLink.delete({ where: { id: matchedPending.id } }),
      ]);

      await logSecurityEvent({
        eventType: "recovery_setup_telegram_linked",
        actor: userId,
        request,
        details: "Recovery setup: Telegram linked via manual code",
      });

      return NextResponse.json({
        success: true,
        data: { telegramLinked: true },
        message: "Telegram linked successfully.",
      });
    }

    return NextResponse.json({ success: false, data: null, message: "Unrecognized request." }, { status: 400 });
  } catch (error) {
    console.error("[recovery-setup/telegram/link] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Something went wrong. Please try again.", error: "Unexpected error" },
      { status: 500 }
    );
  }
}
