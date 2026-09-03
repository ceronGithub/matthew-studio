# Buyer Account Recovery — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Standard forgot-password flows (email link only, or authenticator-app OTP only) each break down in different ways — an email-only flow fails if the inbox is compromised alongside the password; an authenticator-only flow fails if the buyer loses that one device. This spec adds a **three-channel recovery system**: right after registration, the buyer sets up three independent recovery methods, any ONE of which is enough to reset their password later:

1. **Email OTP/Link** — a 6-digit code (or magic link) sent to the buyer's registered email, confirming the buyer still controls that inbox.
2. **Telegram OTP** — works from any device, because it only requires the buyer to be logged into their own Telegram account somewhere (phone, another phone, Telegram Web on any browser) — not the original device.
3. **Security Question** — one question the buyer picks and answers, for the case where both email and Telegram are unavailable.

When the buyer clicks "Forgot Password," they see all three as options and pick whichever one they can still use. Get it right → set a new password on a separate page. Per Rule 47/48 of the operational protocol, this trio is mandatory the moment a project has self-registration.

---

## 2. RECOVERY SETUP (Mandatory, Post-Registration)

**This is a required step, not optional.** It happens immediately after account creation succeeds, BEFORE the buyer reaches `/buyer/dashboard` or the existing First-Time Buyer Onboarding modal (`login_and_registration_page_done.md` Section 10). A buyer cannot skip this and come back to it later — without it, there is no way to recover their account, so it has to be captured while they're already in the signup flow.

**Route:** `/auth/register/recovery-setup` (blocking screen, no way to reach `/buyer/dashboard` without completing it — enforced in `middleware.ts` by checking a `recoverySetupComplete` flag on the buyer's account)

### 2.1 — Step 1: Verify Email

**Why this is first:** it's already the buyer's registered email, so this step only confirms they actually control that inbox — cheapest and fastest of the three to complete.

**UI:**

- Auto-sent on page load: a 6-digit OTP to the buyer's registered email via EmailJS (Rule 35.5, `password_recovery_email_otp` template)
- 6-digit code input field
- "Resend Code" link (disabled for 60 seconds after each send, standard OTP cooldown)
- "Verify Email" button

**On success:** `emailVerifiedForRecovery = true`, proceed to Step 2.

### 2.2 — Step 2: Link Telegram

**Why Telegram specifically:** it's the one method here that doesn't depend on the buyer remembering anything — just having access to their own Telegram account from wherever they are.

**Instructions shown on screen (required, since most buyers won't know how Telegram bot linking works):**

```
1. Open Telegram on any device (phone, tablet, or web.telegram.org)
2. Search for @MatthewStudioBot — or tap the button below to open it directly
3. Tap "Start" (or send /start) in the chat with the bot
4. The bot will reply with a 6-digit code
5. Copy that code and paste it into the field below
```

**UI:**

- "Open Telegram" button — deep link `https://t.me/MatthewStudioBot?start=<linkToken>` (opens the Telegram app directly to the bot, pre-filled — cuts the 5 manual steps above down to 2 taps in practice)
- 6-digit code input field (buyer pastes what the bot sent back, in case the deep link path didn't auto-complete — see 2.2.1)
- "Verify & Link" button

**2.2.1 — How linking actually completes (two paths, same result):**

- **Deep-link path (typical):** the `linkToken` in the URL is already tied to the buyer's in-progress registration on the backend. When the buyer taps "Start" via the deep link, Telegram sends that token to the bot's webhook automatically — the backend matches the token to the buyer's account, captures the Telegram `chat_id` from the webhook payload, and the frontend polls a status endpoint that flips to "linked" within a few seconds. No code entry needed.
- **Manual fallback path:** if the buyer opened Telegram separately (didn't use the deep link, e.g. searched for the bot manually), the bot's `/start` reply includes a 6-digit code instead of auto-linking. The buyer types that code into the field on this page, which calls an endpoint that matches the code to the buyer's session and captures the `chat_id` the same way.

**Critical technical note:** Telegram's Bot API cannot message a user by username — it requires a `chat_id`, which is only obtainable once the user has messaged the bot first. This is exactly why the instructions above exist and why this can't be simplified to "just enter your Telegram username."

**Requirement:** this step cannot be skipped. "Verify & Link" only enables once linking succeeds.

### 2.3 — Step 3: Security Question

**Purpose:** a third, independent fallback for buyers who later lose access to both email and Telegram.

**UI:**

- One dropdown pulling from the shared Question Bank (2.3.1)
- Answer input below the dropdown (required, min 2 characters, case-insensitive comparison at verification time)
- Helper text: "Choose a question only you would know the answer to — not something a friend or social media could guess."

**2.3.1 — Question Bank (buyer picks 1 of these):**

- What was the name of your first pet?
- What was your childhood best friend's first name?
- What is your mother's maiden name?
- What city were you born in?
- What was the model of your first car?
- What was the name of your elementary school?
- What was your favorite teacher's name?
- What street did you grow up on?

**Requirement:** the question must be answered before the buyer can proceed — same "no skip" rule as Steps 1 and 2.

### 2.4 — Completion

Once all three steps are done, `recoverySetupComplete` is set to `true` on the buyer's account, and they proceed to the existing onboarding modal (`login_and_registration_page_done.md` Section 10) and then `/buyer/dashboard` as before.

---

## 3. DATA MODEL

Extends the buyer's existing account record — no new top-level table needed, this is recovery metadata on the buyer themselves.

```prisma
model Buyer {
  // ...existing fields (id, email, fullName, etc.)

  recoverySetupComplete   Boolean  @default(false)

  // Email recovery
  emailVerifiedForRecovery Boolean  @default(false)

  // Telegram recovery
  telegramChatId          String?  @unique   // the real identifier used to send messages — never the username
  telegramLinkedAt        DateTime?

  // Security question — answer is HASHED (bcrypt, same as passwords, Rule 18.2/32.4 pattern),
  // never stored or compared in plaintext
  securityQuestionId      String?            // references the Question Bank (2.3.1), stored as a stable key/enum, not free text
  securityAnswerHash      String?
}
```

**Rule:** the security question answer follows the exact same hashing discipline as passwords (bcrypt, never plaintext, never logged) — a leaked database must not hand out the answer any more than it would hand out passwords.

---

## 4. FORGOT PASSWORD FLOW (`/auth/forgot-password`)

### 4.1 — Step 1: Identify the account

- Email input field
- "Continue" button
- **Anti-enumeration rule (Rule 32.4 pattern):** regardless of whether the email exists, the response always proceeds to Step 2 with the same timing and the same three generic option cards — never reveal "email not found" here, since that would let an attacker probe which emails have accounts.

### 4.2 — Step 2: Pick a recovery method (the three choices)

Three cards, buyer picks one:

1. **"Recover via Email"** — sends a code to the email on file
2. **"Recover via Telegram"** — works even without your original device
3. **"Answer Security Question"** — shows the actual question text the buyer picked in Section 2.3 (e.g. "What was the name of your first pet?"), only if that email has a linked account; if the email doesn't exist, shows a generic placeholder question so the card looks identical either way (anti-enumeration, same principle as 4.1)

### 4.3 — Step 3a: Email path

- Backend sends a 6-digit OTP to the buyer's registered email via EmailJS
- Buyer enters the code (5-minute expiry, same pattern as a standard OTP)
- Correct code → proceed to Step 4 (set new password)

### 4.4 — Step 3b: Telegram path

- Backend sends a 6-digit OTP to the buyer's linked `telegramChatId` via the bot
- Buyer enters the code (5-minute expiry, same pattern as a standard OTP)
- Correct code → proceed to Step 4

### 4.5 — Step 3c: Security question path

- Buyer types their answer to the question
- Backend compares against the bcrypt hash (case-insensitive, trimmed)
- Correct answer → proceed to Step 4
- **Rate limiting (Rule 32.1 pattern):** counts toward the same combined limit as 4.6 below — a single low-entropy method needs to be at least as strict as the other two, not looser.

### 4.6 — Step 4: Set new password

- New Password + Confirm Password fields, same validation rules as registration (Section 3.2 of `login_and_registration_page_done.md`)
- Rendered on a **separate page** (`/auth/reset-password?token=`) — never inline on the same screen as the Step 3 verification, so a verified-but-abandoned recovery session can't be silently reused from the same view.
- On success: password updated, all existing sessions for that buyer invalidated (origin-scoped session termination, Rule 44 — a device that was compromised enough to need recovery shouldn't stay logged in elsewhere), toast confirmation, redirect to `/auth/login`.

---

## 5. API ENDPOINTS

### POST /api/auth/recovery-setup/email

**Request:** `{ "action": "send" }` or `{ "action": "verify", "code": "123456" }`

**Response:**

```json
{
  "success": true,
  "data": { "emailVerified": true },
  "message": "Email verified successfully."
}
```

### POST /api/auth/recovery-setup/telegram/link

**Request:** `{ "linkToken": "..." }` (deep-link path) or `{ "code": "123456" }` (manual fallback path)

**Response:**

```json
{
  "success": true,
  "data": { "telegramLinked": true },
  "message": "Telegram linked successfully."
}
```

### POST /api/auth/recovery-setup/security-question

**Request:**

```json
{
  "questionId": "first_pet",
  "answer": "Bantay"
}
```

### POST /api/auth/forgot-password/initiate

**Request:** `{ "email": "buyer@example.com" }`

**Response (always the same shape, enumeration-safe):**

```json
{
  "success": true,
  "data": {
    "methods": ["email", "telegram", "security_question"],
    "questionText": "..."
  },
  "message": "Choose a recovery method."
}
```

### POST /api/auth/forgot-password/verify

**Request (Email):** `{ "email": "...", "method": "email", "otp": "123456" }`
**Request (Telegram):** `{ "email": "...", "method": "telegram", "otp": "123456" }`
**Request (Security Question):** `{ "email": "...", "method": "security_question", "answer": "..." }`

**Response:**

```json
{
  "success": true,
  "data": { "resetToken": "..." },
  "message": "Identity verified."
}
```

### POST /api/auth/forgot-password/reset

**Request:** `{ "resetToken": "...", "newPassword": "..." }`

**Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully. Please log in."
}
```

---

## 6. SECURITY REQUIREMENTS

- Rate limiting on `/api/auth/forgot-password/*` follows Rule 32.1's priority table (5 attempts / 15 min per IP AND per account — whichever limit is hit first applies) — combined across ALL THREE methods, not 5 per method.
- Every attempt (success or failure) logs to `SecurityLog` (Rule 38) with eventTypes: `password_recovery_initiated`, `password_recovery_succeeded`, `password_recovery_failed`.
- **Gatekeeper integration** (`gatekeeper_specification.md` Section 4.2 / Protocol Rule 47.3): `password_recovery_failed` is a strike-eligible trigger — 3 failed recovery attempts (wrong email OTP, wrong Telegram OTP, or wrong security answer) within 24h from the same device contributes toward an automatic device ban, same as brute-force login.
- `TELEGRAM_BOT_TOKEN` is server-side only — never exposed to the client, never in a `NEXT_PUBLIC_` variable (Rule 18.5 / 31.8). Email OTP reuses the existing EmailJS keys (Rule 35.5) — no separate email service.
- `resetToken` from the verify step is single-use and short-lived (10-minute expiry) — prevents a verified-but-abandoned recovery session from being reused later.
- Successful password reset invalidates all other active sessions for that buyer (Section 4.6) — pairs with the origin-scoped logout pattern (Rule 44) already used elsewhere in this project.

---

## 7. TOAST NOTIFICATIONS (Rule 22)

| Action                       | Type    | Message                                                |
| ---------------------------- | ------- | ------------------------------------------------------ |
| Email OTP sent               | success | `✓ Code sent to your email.`                           |
| Email verified               | success | `✓ Email verified successfully.`                       |
| Wrong email OTP              | error   | `✕ Incorrect code. Please try again.`                  |
| Telegram linked              | success | `✓ Telegram linked successfully.`                      |
| Telegram link failed/expired | error   | `✕ Linking code expired. Please try again.`            |
| Security question saved      | success | `✓ Security question saved.`                           |
| Wrong security answer        | error   | `✕ That answer doesn't match our records.`             |
| Too many failed attempts     | error   | `✕ Too many attempts. Please try again in 15 minutes.` |
| Password reset success       | success | `✓ Password reset successfully. Please log in.`        |

---

## 8. ENVIRONMENT VARIABLES

```
TELEGRAM_BOT_TOKEN=              ← server-side only, from @BotFather
TELEGRAM_BOT_USERNAME=           ← e.g. "MatthewStudioBot", used to build the deep link
```

(Email OTP reuses the existing `NEXT_PUBLIC_EMAILJS_*` keys from Rule 35.5 — no new environment variables needed for email.)

---

## 9. TESTING & VERIFICATION CHECKLIST

- [ ] A buyer cannot reach `/buyer/dashboard` after registration without completing all three: email verification, Telegram linking, and the security question
- [ ] Email OTP expires after 5 minutes, resend is rate-limited to once per 60 seconds
- [ ] Deep-link Telegram flow auto-links without requiring manual code entry
- [ ] Manual fallback (typed 6-digit code) also successfully links `chat_id` to the buyer's account
- [ ] Security question answer is stored hashed, never plaintext, never appears in logs
- [ ] Forgot Password Step 1 behaves identically (same response shape/timing) whether the email exists or not
- [ ] Telegram OTP expires after 5 minutes
- [ ] Combined rate limit (5 attempts/15 min) applies across all three methods together, not 5 each
- [ ] Successful recovery via ANY of the 3 methods lets the buyer set a new password on the separate reset page
- [ ] Resetting the password invalidates all of that buyer's other active sessions
- [ ] 3 failed recovery attempts from the same device within 24h trigger a Gatekeeper strike
- [ ] All tests pass with `npx tsc --noEmit`

---

## 10. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | Initial specification created — device-independent buyer account recovery. Mandatory post-registration setup (Telegram bot linking via deep-link + manual fallback, 2 security questions from a shared Question Bank). Forgot-password flow with 3 buyer-chosen recovery methods, any one sufficient to reset the password. Cross-referenced into `gatekeeper_specification.md`'s strike triggers and `login_and_registration_page_done.md`'s post-registration flow. |
| 2026-09-04 | Revised recovery trio per operational protocol Rule 48: replaced 2 security questions with **1**, added **Email OTP/Link** as a new first-class recovery channel (reuses EmailJS, Rule 35.5). New setup order: Email → Telegram → Security Question. Forgot-password now offers 3 choices (Email / Telegram / Security Question). Data model, API endpoints, rate limiting, and testing checklist updated to match.                                                   |

---

**Document Version:** 2.0
**Last Updated:** 2026-09-04
**Status:** Specification Complete — not yet built (no Telegram bot integration, email OTP wiring, or recovery-setup screen exists yet; buyer registration currently ends at the onboarding modal only)
