# Trial Tracking, Developer Telegram Notifications & Auto-Lockdown/Invoice — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Extends the Tier 1 Free Trial Program (see `tier1_free_trial_subscription_specification.md`
and `villa-azure-agreement-v8-DRAFT-with-trial.txt`) with the operational
automation needed to run it day-to-day, without the developer having to
manually track every trial client's countdown.

**Where this gets built:** the deployed client template itself (e.g.
`small-time-resort-template`, and any other Tier 1 template repo used for
a trial deployment) — NOT Matthew Studio. Each client's booking data,
super-admin dashboard, and First-Run Setup Wizard already live in that
codebase per deployment; building this feature there keeps every trial
self-contained to its own site with no cross-system dependency back to
Matthew Studio. This spec document itself stays in the `matthew-studio`
repo alongside the other Tier 1 business-rule specs, per existing
convention — the doc's home and the code's home are different, on
purpose.

**Target User:** the developer (Service Provider) monitoring one or more
active Tier 1 trial clients, and the resort owner (Client) who receives
the non-conversion invoice.

Not yet built. Spec-only, same status as every other `_specification.md`
in this repo until explicitly marked `_done`.

---

## 2. CORE FEATURES

### 2.1 — Trial Day Tracker
- Trial start date is set once, during initial deployment (First-Run
  Setup Wizard or a manual seed value) — this is the Day 1 anchor.
- Trial end is always Day 30, 11:59 PM (PHT), per the contract's
  automatic-termination clause.
- Current day-of-trial is computed on demand (no need to store it
  separately) from the start date; the super-admin dashboard displays a
  simple "Day X of 30" / days-remaining readout.

### 2.2 — Developer Telegram Setup (Wizard Extension)
- Extends the existing First-Run Setup Wizard (Step 4 — RemainingEnvStep,
  or a new dedicated step) with a Telegram linking flow for the
  **developer's own** Telegram account — never the client's.
- Deep-link pattern consistent with the account-recovery Telegram flow
  already used elsewhere (`@ProjectBot?start=<linkToken>`): developer taps
  the link, bot captures `chat_id`, wizard confirms the link is live
  before letting the wizard proceed.
- `TELEGRAM_BOT_TOKEN` stays server-side only, never `NEXT_PUBLIC_`.
- This step only matters for deployments where the Tier 1 Free Trial is
  active — a client who paid upfront (no trial) can skip it.

### 2.3 — Daily Developer Reminders (Day 20–30)
- Starting Day 20 of the trial, a scheduled job sends the developer one
  Telegram message per day with the days-remaining count, until Day 30.
- Reminders stop immediately the moment the trial is marked Converted
  (see 2.5) — no reminder fires for a trial that's already resolved.

### 2.4 — Auto-Lockdown + Invoice Generation (Day 30, T-minus 8 hours)
- A scheduled job runs 8 hours before the Day 30, 11:59 PM cutoff
  (≈ 3:59 PM PHT on Day 30).
- The job first checks conversion status. If already Converted, it does
  nothing and exits.
- If NOT converted, it:
  1. Locks down the public-facing site and admin dashboard (matches the
     contract's non-conversion offline behavior).
  2. Generates a PDF invoice of every booking made during the trial —
     pending, booked (confirmed), and cancelled — so the client has a
     record of guest activity even though the site is going offline.
  3. Emails the PDF automatically to the resort owner (Client), per the
     contract's no-charge data/records handoff on non-conversion.
  4. Marks the trial status as Locked (Non-Conversion).

### 2.5 — Late-Conversion Reversal
Conversion is a manual event — the contract requires written notice plus
the Trial Conversion Fee, not an automated online payment — so it is
recorded by the developer flipping a "Mark as Converted" action on the
super-admin dashboard, at any point.

- **Converted before the T-8h job runs:** the job's status check (2.4,
  step 1) simply skips lockdown entirely. Nothing else happens; the
  client proceeds as a standard paid Tier 1 client from Month 2.
- **Converted after lockdown already executed:** marking Converted
  immediately reverses the lockdown — site and dashboard restored to
  normal access — and cancels the invoice if it has not yet been emailed
  to the client. If the invoice was already sent, it is left as-is (it's
  just a record of their own bookings, not a bill demanding payment) and
  the trial status is shown as "Converted (invoice sent, superseded)."

---

## 3. DATA MODEL

Single-tenant per deployment — one trial record per site, not a
multi-client table (each Tier 1 trial client gets their own deployment
with its own database).

```prisma
model TrialStatus {
  id                 String    @id @default(cuid())
  trialStartDate     DateTime
  trialEndDate       DateTime                    // computed at creation: startDate + 30 days, 11:59 PM PHT
  conversionStatus   String    @default("active") // active | converted | locked_non_conversion
  convertedAt        DateTime?
  lockedAt           DateTime?
  invoiceGeneratedAt DateTime?
  invoiceR2Key       String?                      // per Rule 35.6 — documents/ subfolder
  invoiceR2Url       String?
  invoiceEmailedAt   DateTime?
  telegramChatId     String?                      // developer's own chat_id, linked via wizard
  lastReminderSentAt DateTime?                     // last Day 20-30 reminder sent, prevents duplicate sends
}
```

---

## 4. USER FLOW

```
Day 1   : Trial deployment goes live. trialStartDate set. Developer
          links Telegram during wizard (2.2) if not already done.
Day 1-19: No reminders. Dashboard shows "Day X of 30."
Day 20  : First daily Telegram reminder sent to developer.
Day 20-29: Daily reminders continue. Client may notify + pay Trial
          Conversion Fee at any point — developer marks "Converted" on
          the dashboard when this happens. Reminders stop immediately.
Day 30, 3:59 PM PHT (T-8h):
          Scheduled job checks conversionStatus.
          - If "converted" -> exit, no action.
          - If "active" -> lock site+dashboard, generate PDF invoice of
            all bookings (pending/booked/cancelled), email to Client,
            set conversionStatus = "locked_non_conversion."
Day 30, any time after lockdown:
          If developer marks "Converted" late -> site/dashboard restored
          immediately, invoice cancelled if not yet emailed (left as-is
          if already sent), conversionStatus = "converted."
Day 30, 11:59 PM PHT:
          Contract's formal automatic-termination point, if still
          non-converted. Site is already offline since 3:59 PM per 2.4.
```

---

## 5. ACCESS CONTROL — TELEGRAM-CONFIRMED CONVERSION

The Client's own account holds the `super_admin` role on their deployed
site (per `services/adminSession.js` — there is no separate "developer"
role in the base template). The "Mark as Converted" action must
therefore never be a plain, single-click button reachable by that
account — otherwise the Client could self-mark their trial as converted
without actually paying.

**Flow:**
1. "Mark as Converted" stays inside the existing super-admin dashboard
   (no separate developer portal/route needed).
2. Clicking it does NOT finalize anything. It generates a one-time,
   6-digit code (10-minute expiry, single-use) and sends it via Telegram
   to the developer's `telegramChatId` (linked during the wizard, per
   2.2).
3. The dashboard then shows a code-entry field: "Enter the code sent to
   the developer's Telegram to confirm."
4. Only a correct, unexpired code finalizes the conversion — triggering
   the full flow from Section 2.5 (status flip, unlock if already
   locked, invoice cancellation if not yet sent).
5. Wrong or expired code returns a generic error — no hint about which
   part failed. Rate-limited at 5 attempts / 15 minutes per trial record
   (Rule 32.1 pattern), same generic message on limit-hit.
6. Every attempt — success or failure — logs to `SecurityLog` (Rule 38)
   as `trial_conversion_confirmed` / `trial_conversion_code_failed`.

This means whoever clicks the button (including the Client), the action
cannot complete without the code that only reaches the developer's own
Telegram — no separate credential system or hidden route required.

**Data model addition (extends `TrialStatus` from Section 3):**
```prisma
model TrialStatus {
  // ...existing fields from Section 3...
  conversionCodeHash    String?    // bcrypt hash, never stored plaintext
  conversionCodeSentAt  DateTime?
  conversionCodeExpires DateTime?  // sentAt + 10 minutes
  conversionAttempts    Int        @default(0) // resets after a correct code or after the 15-min rate-limit window passes
}
```

---

## 6. OPEN ITEMS (not covered by this spec)

- The contract's `[ASSUMPTION — CONFIRM]` on the 48-hour data-export
  window (line 240 of the v8 draft) is separate from this spec's
  auto-generated bookings PDF — that PDF is a courtesy record sent
  automatically, not the formal "data export on request" the contract
  clause describes. Still needs its own confirm.
- The still-open Criteria 2/3 simultaneous-stacking question (Section
  3.6 of `tier1_free_trial_subscription_specification.md`) is unrelated
  to this feature and remains unresolved.
