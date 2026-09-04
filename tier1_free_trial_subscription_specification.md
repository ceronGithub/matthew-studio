# Tier 1 Free Trial Subscription Program — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Business plan (not yet built, not yet legally finalized): Tier 1 clients
(the Villa Azure-style Managed Rental model — see
`villa-azure-agreement-v7-COMPREHENSIVE.txt` and its v8 draft) may
optionally start with a 30-calendar-day free trial instead of paying
immediately. The client has a decision window through Day 29 to commit;
if they do, they pay a one-time Trial Conversion Fee and continue as a
standard paid Tier 1 client from Month 2 onward. If they don't commit by
Day 30, the agreement auto-terminates and the deployed site/dashboard
goes offline.

This document is the source of truth for the **business rules**. The
matching **contract language** lives in the client-facing agreement
(currently drafted as an addition to Villa Azure's Section 2/4A/5/8A/19 —
see the v8 draft delivered alongside this spec). Neither the contract
clause nor the technical automation described below has been reviewed
by a lawyer or built yet — this is spec-only, same status as every other
`_specification.md` in this repo until explicitly marked `_done`.

**Target User:** a prospective Tier 1 client (resort owner) evaluating
whether to commit to the Managed Rental model.

---

## 2. OPEN QUESTIONS (must be resolved before this is contract-ready)

These are called out with `[ASSUMPTION — CONFIRM]` markers in the v8
contract draft too — repeated here so the business decision isn't
buried in legal text:

1. **Does the ₱25,000 Trial Conversion Fee replace or add to** the
   standard ₱15,000 Setup Fee + ₱15,000 Month 1 (₱30,000 combined)?
   Drafted as a ₱5,000-discount replacement — confirm or correct.
2. **Is the trial site live/production** (real guests can book real
   reservations) or a staging copy? This drives the "Guest Bookings
   Made During Trial" liability question below.
3. **Exact Day 30 mechanics** — is takedown immediate at 11:59 PM PHT,
   or does it follow the existing Tier 1 pattern of a 24-hour grace
   window before dashboard access is disabled?
4. **Data export on non-conversion** — free 48-hour window (matching
   standard Tier 1 cancellation) or no export at all, since no payment
   was ever received?
5. **3-month lock-in start point** — does it begin at the Trial
   Conversion payment (Month 2 of the relationship = Month 1 of
   lock-in), or somewhere else?
6. **Trial eligibility/abuse prevention** — one trial per
   client/business, verified how? Currently drafted as Service
   Provider's discretion, no hard technical check specified.
7. **Guest bookings made during an unconverted trial** — who's
   responsible for honoring/relocating/refunding them once the site
   goes offline? Currently drafted as the resort owner's (Client's)
   responsibility, with a recommendation (not requirement) to disable
   live public bookings during evaluation-only trials.

---

## 3. BUSINESS RULES (as currently drafted)

### 3.1 — Trial period (Days 1–30)
- Full Tier 1 onboarding proceeds normally: deployment, branding,
  content population, full admin dashboard, security monitoring,
  10 hrs/week included support (same as a paid month).
- No Setup Fee, no Monthly Fee charged.

### 3.2 — Decision window (Days 1–29)
- Client must give written notice (email sufficient) of intent to
  subscribe, and pay the Trial Conversion Fee, by Day 29.

### 3.3 — Conversion (client subscribes)
- Trial Conversion Fee: ₱25,000 one-time.
- Month 2 onward: standard ₱15,000/month Tier 1 fee, no discount.
- 3-month minimum commitment starts counting from the Trial Conversion
  payment.
- Client's own infrastructure costs (Vercel Pro, etc.) become their
  responsibility starting Month 2.

### 3.4 — Non-conversion (client does not subscribe by Day 30)
- Agreement auto-terminates, no penalty to client.
- Site/dashboard taken offline.
- Data export available on request (window TBD — see Open Questions).
- Repeat trials require Service Provider's written consent.

### 3.5 — Everything else unchanged
- Feature-request pricing (`Section 6`) and overage support billing
  (`Section 3A`) apply during the trial exactly as in a paid month —
  only the Setup/Monthly Fee is waived, not custom work.
- Uptime SLA (`Section 5`) applies during the trial at the same 99%
  target as a paid month.

---

## 4. FUTURE TECHNICAL BUILD (not started)

Once the contract terms above are confirmed and signed, the matching
technical feature — for this to actually enforce itself rather than
being tracked manually — would need:

- A `trialEndsAt` / `trialStatus` field on whatever tenant/client record
  represents a Tier 1 deployment (this repo's own schema doesn't have a
  multi-tenant client model yet — Villa Azure and any other Tier 1
  client today are presumably each their own separate deployment/repo,
  not rows in a shared `matthew-studio` database. If Tier 1 clients are
  ever managed from a shared admin panel in *this* codebase, that's a
  separate, larger spec of its own.)
- A scheduled job (cron/edge function) that checks trial status daily
  and auto-disables dashboard access + takes the public site offline at
  the Day 30 cutoff if no conversion payment was recorded.
- A notification/reminder to the client as Day 29 approaches (email,
  per the existing EmailJS pattern used elsewhere in this repo).
- Recording the Trial Conversion Fee payment and flipping the client to
  standard paid status, resetting the lock-in clock per Section 3.3.

None of this is built. This spec documents the business rules only, so
the eventual technical build (and any future contract amendments) has
one source of truth to work from.

---

## 5. CHANGE LOG

| Date | Change |
|---|---|
| 2026-09-04 | Initial specification, drafted alongside a matching contract addition to `villa-azure-agreement-v7-COMPREHENSIVE.txt` (delivered as a v8 draft). Several terms are explicitly unconfirmed — see Section 2. Not reviewed by a lawyer. Spec-only, no technical build started. |
