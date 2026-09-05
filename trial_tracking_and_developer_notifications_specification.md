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

### 2.2 — Developer Contact Setup (Env Vars, Never Wizard/Dashboard-Editable)

- Reuses the vault's own developer-contact pattern instead of a separate
  DB-linked Telegram flow — one developer identity for both vault
  recovery and trial notifications, not two. The deployed template
  already has `VAULT_OWNER_EMAIL` (`services/vaultOtp.js` /
  `services/vaultPassphrase.js`) for exactly this purpose; this spec adds
  the matching `VAULT_OWNER_TELEGRAM_CHAT_ID`.
- Both env vars are pasted into `.env.local` during initial deployment,
  same step where `TELEGRAM_BOT_TOKEN` already gets set — **never
  editable via any wizard form or dashboard settings page afterward**,
  unlike `SystemSettings.adminTelegramChatIds` (the client/staff
  booking-alert list, which stays dashboard-editable per
  `TelegramChatIdsCard.jsx`). This keeps the developer's own contact info
  structurally separate from anything the Client's `super_admin` account
  can see or change — no DB row, no admin UI, no way for the Client to
  even find where it's set.
- `TELEGRAM_BOT_TOKEN` stays server-side only, never `NEXT_PUBLIC_`, same
  as before.
- Both env vars only matter for deployments where the Tier 1 Free Trial
  is active — a client who paid upfront (no trial) can leave them unset.

### 2.3 — Daily Developer Reminders (Day 20–30)

- Starting Day 20 of the trial, a scheduled job sends the developer one
  Telegram message per day with the days-remaining count, until Day 30.
- **Dual-channel, no retry (v2 review Item #4):** the same reminder is
  also emailed to `VAULT_OWNER_EMAIL` alongside the Telegram send — same
  "independent second channel" reasoning already used for the vault's
  own OTP/passphrase sends (`services/vaultOtp.js`,
  `services/vaultPassphrase.js`), so a blocked bot, wrong chat ID, or
  network blip on one channel never means the developer misses the
  reminder entirely. Consistent with `services/telegram.js`'s existing
  best-effort design (`sendTelegramMessage()` never throws, never
  retries) — no added retry-with-backoff logic, since redundancy across
  two channels covers more failure modes than retrying a single channel
  that may be permanently blocked.
- Every reminder attempt — Telegram success/failure, email
  success/failure — logs to `SecurityLog` (Rule 38) as
  `trial_reminder_sent` / `trial_reminder_send_failed`, so a missed
  reminder is auditable rather than silent.
- Reminders stop immediately the moment the trial is marked Converted
  (see 2.5) — no reminder fires for a trial that's already resolved.

### 2.4 — Auto-Lockdown + Invoice Generation (Day 30, T-minus 8 hours)

- A scheduled job runs 8 hours before the Day 30, 11:59 PM cutoff
  (≈ 3:59 PM PHT on Day 30).
- The job first checks conversion status. If already Converted, it does
  nothing and exits.
- If NOT converted, it: 0. **Idempotency guard (v2 review Item #7):** before each of steps 1-3
  below, the job checks that step's own marker on `TrialStatus` —
  `lockedAt`, `invoiceGeneratedAt`, `invoiceEmailedAt` (all already in
  Section 3's model, no new fields needed) — and skips that step
  entirely if its marker is already set. Each marker is written to the
  DB immediately after that step succeeds, not batched at the end.
  This makes the whole job safe to re-invoke at any time (a cron
  retry after a crash, or a manual re-run) without repeating a step
  that already completed — most importantly, it can never send the
  invoice email (step 3) a second time just because the job crashed
  between step 3 and step 4.
  1. Locks down the public-facing site and the regular admin dashboard
     (matches the contract's non-conversion offline behavior). This
     never touches `/system-vault/[vaultSlug]` — that route already runs
     its own passphrase + OTP gate, structurally independent of the
     `session`/`vaultSession` cookies and middleware every `/superAdmin/*`
     page relies on (per `services/vaultAuth.js`), so it stays reachable
     through the lockdown by construction, not as a special exception
     carved out for this feature. Skipped if `lockedAt` is already set
     (Item #7); otherwise sets `lockedAt` immediately on success.
  2. Generates a PDF invoice of every booking made during the trial —
     pending, booked (confirmed), and cancelled — so the client has a
     record of guest activity even though the site is going offline.
     **Zero-bookings case (v2 review Item #9):** still generated, never
     skipped — if no bookings exist for the trial period, the PDF states
     "No bookings were recorded during this trial period" instead of a
     blank/empty table, so the client sees a clear record rather than
     something that could be mistaken for a bug. No special-case branch
     in the job itself (Item #7's idempotency guard is unaffected) —
     only the PDF's content differs.
     Skipped if `invoiceGeneratedAt` is already set (Item #7) — reuses
     the existing `invoiceR2Key`/`invoiceR2Url` instead of regenerating;
     otherwise sets `invoiceGeneratedAt` immediately on success.
  3. Emails the PDF automatically to the resort owner (Client), per the
     contract's no-charge data/records handoff on non-conversion. Skipped
     if `invoiceEmailedAt` is already set (Item #7) — this is the step
     the guard exists to protect, since re-sending here is the one
     doubled action that would actually reach the client; otherwise sets
     `invoiceEmailedAt` immediately on success.
     **Recipient resolution (v2 review Item #5):** looked up as
     `prisma.adminProfile.findFirst({ where: { isOwner: true } })` →
     that profile's `id` → `adminClient.auth.admin.getUserById(id)` for
     the actual email (per `services/supabase.js`'s `adminClient`) —
     never any other `super_admin` account's email, even if a
     front-desk/staff admin also holds that role. If no `isOwner: true`
     profile exists, or the Supabase lookup fails, the invoice is NOT
     silently dropped: the failure escalates to the developer over the
     same dual channel from 2.3 (`VAULT_OWNER_EMAIL` +
     `VAULT_OWNER_TELEGRAM_CHAT_ID`), since a missing/broken owner
     account at this exact moment needs manual attention. Every attempt
     logs to `SecurityLog` as `trial_invoice_sent` /
     `trial_invoice_send_failed`, with the owner's email masked (same
     masking pattern as `services/vaultOtp.js`'s `maskEmail()`), never
     logged in full.
  4. Marks the trial status as Locked (Non-Conversion) — always the
     last action, only once steps 1-3 have each either run or been
     confirmed already-done.
  5. **Job completion notification (v2 review Item #6):** once steps
     1-4 finish (or the job's top-level try/catch catches an unexpected
     crash partway through), a single summary is sent to the developer
     over the same dual channel as 2.3/2.4-step-3
     (`VAULT_OWNER_EMAIL` + `VAULT_OWNER_TELEGRAM_CHAT_ID`), listing
     each step's outcome: lockdown ✓/✕, invoice generated ✓/✕, invoice
     emailed ✓/✕ (cross-referencing the step-3 escalation above if that
     one failed), and overall job status. This is a push notification,
     not just a dashboard-visible log row — deliberately different from
     the nightly backup job's silent `BackupLog` pattern (Rule 40.6),
     since this event is rare (once per trial) and high-stakes enough
     that the developer wants to know immediately rather than checking
     a dashboard. Logs to `SecurityLog` as `trial_lockdown_job_completed`
     / `trial_lockdown_job_failed`.

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
  normal access, `unlockedAt` set (v2 review Item #8 — the audit-trail
  counterpart to `lockedAt`, so a late reversal is timestamped and
  distinguishable from a trial that never locked at all) — and cancels
  the invoice if it has not yet been emailed
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
  unlockedAt         DateTime?                    // set on late-conversion reversal (2.5) — audit trail counterpart to lockedAt
  invoiceGeneratedAt DateTime?
  invoiceR2Key       String?                      // per Rule 35.6 — documents/ subfolder
  invoiceR2Url       String?
  invoiceEmailedAt   DateTime?
  lastReminderSentAt DateTime?                     // last Day 20-30 reminder sent, prevents duplicate sends
  // No telegramChatId field — the developer's contact point is the
  // deployment-wide VAULT_OWNER_TELEGRAM_CHAT_ID env var (Section 2.2),
  // not a per-trial DB value.
}
```

---

## 4. USER FLOW

```
Day 1   : Trial deployment goes live. trialStartDate set. Developer's
          VAULT_OWNER_EMAIL / VAULT_OWNER_TELEGRAM_CHAT_ID (2.2) already
          set in .env.local as part of initial deployment.
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

## 5. ACCESS CONTROL — "MARK AS CONVERTED" LIVES IN THE VAULT

The Client's own account holds the `super_admin` role on their deployed
site (per `services/adminSession.js` — there is no separate "developer"
role in the base template). "Mark as Converted" must therefore never be
reachable from anywhere a `super_admin`/`session` cookie alone can reach
— otherwise the Client could self-mark their trial as converted without
actually paying.

**Revision from v2:** rather than a dashboard button gated by a
purpose-built 6-digit Telegram code (the original design), "Mark as
Converted" is placed inside the existing hidden vault
(`/system-vault/[vaultSlug]`, Section 12-equivalent Emergency Actions)
alongside the other owner-only recovery controls. This reuses a
mechanism that's already built and already stronger, instead of adding a
second, parallel one:

- The vault has **no super-admin identity behind it at all** (per
  `services/vaultAuth.js`: _"there is no super-admin session behind it
  anymore"_) — reaching it requires the separate vault passphrase, then
  an OTP emailed to `VAULT_OWNER_EMAIL` and sent via Telegram to
  `VAULT_OWNER_TELEGRAM_CHAT_ID` (2.2). A valid `super_admin` session
  cookie — including the Client's own — grants zero access to this
  route on its own.
- Because this gate is already two-factor (passphrase + OTP) and already
  proves "this is the developer" before the vault's contents even
  render, "Mark as Converted" inside it needs only a standard
  Cancel/Confirm modal (Rule 34.4) — no additional 6-digit code layer on
  top. The vault's own entry gate **is** the confirmation.
- Confirming triggers the full flow from Section 2.5 (status flip,
  unlock if already locked, invoice cancellation if not yet sent).
- Every attempt to reach or use this control — success or failure — logs
  to `SecurityLog` (Rule 38) as `trial_conversion_marked` /
  `trial_conversion_vault_denied`, same as every other vault action.

This also directly resolves the earlier open question of reaching
"Mark as Converted" while the site is fully locked down (2.4): the
vault was never inside that lockdown's blast radius to begin with, so
no separate "Trial Ended" screen or carve-out is needed — the developer
reaches the same vault they'd use for any other recovery scenario.

No data model addition needed for this section — the vault's existing
`VaultPassphrase`/OTP mechanism in the deployed template already covers
what the removed `conversionCodeHash`/`conversionCodeSentAt`/
`conversionCodeExpires`/`conversionAttempts` fields would have
duplicated.

---

## 6. OPEN ITEMS (not covered by this spec)

All 9 items from the v2 review (screenshots) are now resolved — #1
(contract/spec timing), #2 (who can click Convert), #3 (vault survives
lockdown), #4 (Telegram fallback), #5 (invoice recipient), #6 (job
completion notification), #7 (idempotency), #8 (`unlockedAt`), #9
(zero-bookings invoice). The two items below are unrelated to that
review and remain genuinely open:

- The contract's `[ASSUMPTION — CONFIRM]` on the 48-hour data-export
  window (line 240 of the v8 draft) is separate from this spec's
  auto-generated bookings PDF — that PDF is a courtesy record sent
  automatically, not the formal "data export on request" the contract
  clause describes. Still needs its own confirm.
- The still-open Criteria 2/3 simultaneous-stacking question (Section
  3.6 of `tier1_free_trial_subscription_specification.md`) is unrelated
  to this feature and remains unresolved.
