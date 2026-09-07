/**
 * FILE: app/api/telegram/webhook/route.ts
 * ROLE: Public -- called by Telegram's servers only, never the buyer's
 * browser. No session, no CSRF (Telegram doesn't send our cookies).
 *
 * PURPOSE:
 * Receives every update Telegram sends for the bot
 * (buyer_password_recovery_specification.md Section 2.2/2.2.1). Only
 * handles plain-text messages here -- specifically /start commands,
 * which is the only interaction this bot supports.
 *
 * DATA FLOW (two paths, same spec section):
 * 1. Deep-link path: "/start <linkToken>" -- the payload is the token
 *    embedded in the https://t.me/<bot>?start=<token> URL. Matched
 *    directly against BuyerRecovery.telegramLinkToken; on a hit, the
 *    chat_id is captured immediately and linking completes with no
 *    further buyer action (the website polls for this via the
 *    /api/auth/recovery-setup/telegram/link "status" action).
 * 2. Manual path: bare "/start" (no payload) -- the buyer found the
 *    bot without the deep link. A 6-digit code is generated and DMed
 *    back, paired with this chat_id in TelegramPendingLink until the
 *    logged-in buyer types it into the website (task-39's "verify-code"
 *    action claims it).
 *
 * SECURITY NOTE:
 * Optionally verified against TELEGRAM_WEBHOOK_SECRET (set via
 * Telegram's setWebhook secret_token param) if configured -- this is
 * an addition beyond Section 8's two env vars, documented in
 * task-39's file. Skipped (not enforced) if the env var is unset, so
 * this still works before you've registered the webhook with a secret.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { logSecurityEvent } from "@/lib/securityLog";
import {
  generateTelegramOtpCode,
  hashTelegramOtpCode,
  TELEGRAM_OTP_EXPIRY_MINUTES,
} from "@/lib/telegramLink";

export async function POST(request: Request) {
  try {
    // Verify the shared secret if one has been configured (see file
    // header) -- prevents third parties from POSTing forged updates
    // to this public endpoint.
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret) {
      const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (providedSecret !== configuredSecret) {
        return NextResponse.json({ success: false, data: null, message: "Forbidden." }, { status: 403 });
      }
    }

    const update = await request.json();
    const message = update?.message;
    const chatId: string | undefined = message?.chat?.id?.toString();
    const text: string | undefined = message?.text;

    // Telegram sends many update types (edited messages, callback
    // queries, etc.) -- this bot only cares about /start text
    // messages, so anything else is a silent no-op with a 200 (per
    // Telegram's requirement: always 200, or it retries the update).
    if (!chatId || !text || !text.startsWith("/start")) {
      return NextResponse.json({ success: true, data: null, message: "Ignored." });
    }

    const payload = text.replace("/start", "").trim();

    if (payload) {
      // --- Deep-link path ---
      const recovery = await prisma.buyerRecovery.findUnique({ where: { telegramLinkToken: payload } });
      const isExpired =
        !recovery?.telegramLinkTokenExpiresAt || recovery.telegramLinkTokenExpiresAt.getTime() < Date.now();

      if (!recovery || isExpired) {
        await sendTelegramMessage(
          chatId,
          "This link has expired. Please go back to the website and tap \u201COpen Telegram\u201D again."
        );
        return NextResponse.json({ success: true, data: null, message: "Expired or unknown token." });
      }

      await prisma.buyerRecovery.update({
        where: { id: recovery.id },
        data: {
          telegramChatId: chatId,
          telegramLinkedAt: new Date(),
          telegramLinkToken: null,
          telegramLinkTokenExpiresAt: null,
        },
      });

      await sendTelegramMessage(chatId, "\u2705 Your Telegram account is now linked to Matthew Studio.");

      await logSecurityEvent({
        eventType: "recovery_setup_telegram_linked",
        actor: recovery.userId,
        details: "Recovery setup: Telegram linked via deep link",
      });

      return NextResponse.json({ success: true, data: null, message: "Linked." });
    }

    // --- Manual fallback path ---
    // This chat isn't tied to a buyer yet -- generate an OTP and DM
    // it back; the logged-in buyer submits it on the website.
    const code = generateTelegramOtpCode();
    const codeHash = hashTelegramOtpCode(code);
    const expiresAt = new Date(Date.now() + TELEGRAM_OTP_EXPIRY_MINUTES * 60 * 1000);

    // One pending link per chat -- replace any stale unclaimed code
    // from a previous /start rather than accumulating rows.
    await prisma.telegramPendingLink.upsert({
      where: { chatId },
      create: { chatId, codeHash, expiresAt },
      update: { codeHash, expiresAt },
    });

    await sendTelegramMessage(
      chatId,
      `Your Matthew Studio verification code is: ${code}\n\nEnter it on the website to link this Telegram account. This code expires in ${TELEGRAM_OTP_EXPIRY_MINUTES} minutes.`
    );

    return NextResponse.json({ success: true, data: null, message: "OTP sent." });
  } catch (error) {
    // Always 200 back to Telegram even on our own failure -- a 500
    // here just makes Telegram retry the same update repeatedly.
    console.error("[telegram/webhook] Unexpected error:", (error as Error).message);
    return NextResponse.json({ success: true, data: null, message: "Error handled." });
  }
}
