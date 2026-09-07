/**
 * FILE: lib/telegramBot.ts
 * PURPOSE:
 * Thin wrapper around the Telegram Bot API's sendMessage method, used
 * to confirm a successful link (or DM a manual-fallback OTP) back to
 * the buyer's chat. Server-side only -- TELEGRAM_BOT_TOKEN must never
 * reach the client.
 *
 * Fails soft: a failed send is logged and swallowed, never thrown --
 * losing the confirmation DM is a UX inconvenience, not a reason to
 * 500 the webhook (Telegram retries webhooks that error, which would
 * just resend the same update repeatedly).
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<{ success: boolean }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[telegramBot] TELEGRAM_BOT_TOKEN not configured -- message not sent.");
    return { success: false };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      console.error("[telegramBot] sendMessage failed:", response.status, await response.text());
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("[telegramBot] sendMessage threw:", (error as Error).message);
    return { success: false };
  }
}
