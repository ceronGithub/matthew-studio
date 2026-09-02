/**
 * FILE: services/emailjs.ts
 * ROLE: Server-only — wraps EmailJS's REST API for the contact and
 * support form route handlers.
 *
 * PURPOSE:
 * app/api/contact/route.ts and app/api/support/route.ts already own
 * server-side validation and are hit once per submission from their
 * respective Client Component forms — there's no benefit to also
 * shipping the @emailjs/browser SDK to the client just to re-send the
 * same payload from there. Instead, this file posts straight to
 * EmailJS's REST endpoint from the route handler using plain fetch,
 * so nothing new needs to be added to the client bundle.
 *
 * EmailJS blocks REST calls that don't carry a browser Origin header
 * unless the request includes the account's private key as
 * `accessToken` — since these are server-to-server calls, the private
 * key is required (never expose it as NEXT_PUBLIC_; it stays
 * server-only, same as EMAILJS_SERVICE_ID and EMAILJS_PUBLIC_KEY
 * below).
 *
 * DATA FLOW:
 * Caller passes an EmailJS template ID + template_params matching
 * that template's variables. sendEmail() never throws — a missing
 * env var or a failed request both resolve to
 * { success: false, message }, so callers can always return a clean
 * JSON error instead of a 500.
 */

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";

interface SendEmailResult {
  success: boolean;
  message?: string;
}

/**
 * sendEmail
 * Sends a single email through EmailJS using a pre-built template.
 * Requires EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, and
 * EMAILJS_PRIVATE_KEY to be set in the server environment (.env /
 * .env.local — see .env.example). Logs and returns a clean failure
 * instead of throwing if any are missing, so a misconfigured
 * environment never crashes the calling route.
 *
 * @param templateId     - EmailJS template ID (create one per email type in the EmailJS dashboard)
 * @param templateParams - Key-value pairs matching that template's variables
 */
export async function sendEmail(
  templateId: string,
  templateParams: Record<string, string>
): Promise<SendEmailResult> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !publicKey || !privateKey || !templateId) {
    console.error(
      "[emailjs] Missing EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, or template ID."
    );
    return { success: false, message: "Email service is not configured." };
  }

  try {
    const response = await fetch(EMAILJS_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: templateParams,
      }),
    });

    if (!response.ok) {
      // EmailJS returns a plain-text error body, not JSON — log it as-is,
      // never surface it directly to the caller/UI.
      const errorText = await response.text();
      console.error("[emailjs] Send failed:", response.status, errorText);
      return { success: false, message: "Failed to send email. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("[emailjs] Send failed:", error);
    return { success: false, message: "Failed to send email. Please try again." };
  }
}
