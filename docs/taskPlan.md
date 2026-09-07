# MASTER TASK PLAN — matthew-studio (shop branch)

Generated per Rule 49. Source of truth for phase order: overviewProject.txt
Section 5C (SPEC BUILD SEQUENCE), cross-checked against actual code
(Layer-3 grep verification) before being trusted at face value.

Legend: [ ] not started · [~] in progress · [DONE] complete

---

## STEP -1 AUDIT — corrections found this pass

Section 5C is generally accurate and well-maintained (last corrected
2026-09-06), but two lines were stale:

| Module                              | Spec | Schema | Code Wired | Verdict |
|--------------------------------------|------|--------|------------|---------|
| Notifications (4.6, all 3 sources)   | ✅   | ✅     | ✅         | **Done** — was shown [~] |
| buyer_account_specification.md (3)   | ✅   | ✅     | ✅         | **Done** — was shown [~], last blocker (ticket_reply) confirmed wired |
| vault_specification.md (6)           | ✅   | ✅     | ❌         | Schema only — no API/UI |
| Gatekeeper page (item 7's gap)        | ✅   | ✅     | ❌         | Not wired — no `/superAdmin/gatekeeper` route found |
| Security Logs page (item 5's gap)     | ✅   | ✅     | ❌         | `logSecurityEvent()` writes rows, no viewer page |
| Account Activity page (item 5's gap)  | ✅   | ✅     | ❌         | `recordAccountActivity()` writes rows, no viewer page |

Verification commands run: grepped every `createNotification()` call site
(webhook x2, subscription cancel, admin ticket reply — all 3 spec-required
sources confirmed live); `find app/superAdmin` (only `dashboard/` exists);
`find app -ipath "*vault*"` and `*gatekeeper*` (no matches — confirms
schema-only status for both).

`overviewProject.txt` Section 5C has been corrected in place (item 3 and
its 4.6 sub-line flipped to `[DONE]`) with a matching CHANGE LOG entry —
see Section 5C / 8 in that file.

---

## PHASE 4 — SECURITY & ACCESS HARDENING (next up — commerce phases 1-3 are done)

### [~] 6. vault_specification.md — split into micro-tasks (schema already exists)
- [DONE] task-28 — Slug + vault-credentials utility functions (Sections
      2.2/2.3/3.1) — `lib/slugGenerator.ts` + `lib/vaultHelpers.ts`,
      built 2026-09-07. Also corrected a stale "front-end mockup
      already done" claim found in overviewProject.txt — no mockup
      ever existed (vault_specification.md's own Section 13 already
      said so as of 2026-09-05).
- [DONE] task-29 — Modify login/logout routes to issue & clear session
      slug (5.1/5.2) — built 2026-09-07, see
      docs/tasks/task-29-wire-login-logout-slug.md
- [DONE] task-30 — Vault API routes: slug validate, credentials generate,
      credentials store (5.3/5.4/5.5) — built 2026-09-06, confirmed live
      via task-31's Layer-3 audit; this line was stale (still `[ ]`)
      until corrected here per Rule 16.1.
- [DONE] task-31 — Middleware slug validation (7.1), ahead of role-based routing
- [DONE] task-32 — Vault page UI: `/superAdmin/vault/[slug]` + `/admin/vault/[slug]`
      (6.1/6.2) — built 2026-09-07, see
      docs/tasks/task-32-ui-vault-pages.md
- [DONE] task-33 (API half) — Gatekeeper manual-ban/unban backend
      (Sections 5.2/8/9): `listDeviceBans()`/`manualBanDevice()`/
      `unbanDevice()` in `lib/gatekeeper.ts` + the two API routes under
      `app/api/superadmin/gatekeeper/bans/`. Built 2026-09-07, see
      docs/tasks/task-33-gatekeeper-bans-api.md.
- [DONE] task-33 (UI half) — `/superAdmin/gatekeeper` viewer page: DataTable,
      filters, row expand, unban confirmation modal (needs a note-input
      variant of ConfirmationModal). Shared deliverable with item 7 below.
      Built 2026-09-07, see docs/tasks/task-33-gatekeeper-bans-api.md.

### [DONE] 7. gatekeeper_specification.md — CLOSED 2026-09-07
- [DONE] task-33 (UI half, same as above) — viewer page + unban button wired
      to the now-live API. Everything is done: instant-ban, 3-strike logic,
      middleware wiring, manual ban/unban backend, and the viewer page.

### [~] 8. buyer_password_recovery_specification.md
- [DONE] task-34 — Data model additions (recoverySetupComplete, telegramChatId,
      securityQuestionId/Hash fields per Rule 48.2) + Telegram bot env vars.
      Built as a new `BuyerRecovery` table (userId-keyed) rather than the
      spec's literal `model Buyer` block, since this repo has no local
      Buyer/User table — see prisma/schema.prisma header comment and
      overviewProject-2.txt's 2026-09-07 entry.
- [DONE] task-35 (email + security-question half) — `/auth/register/
      recovery-setup` wizard: Email OTP (send/verify) + Security
      Question steps, `RegisterForm` now redirects there post-signup.
      Built 2026-09-07, see docs/tasks/task-35-email-security-question.md.
- [ ] task-35 (Telegram half, remaining) — split into task-38 through
      task-41 (schema/API/UI/middleware) since it spans 4 layers.
- [x] task-38 (schema + lib) — `telegramLinkToken`/`telegramOtpCodeHash`
      fields on BuyerRecovery + `lib/telegramLink.ts`. Built 2026-09-07,
      see docs/tasks/task-38-schema-telegram-link.md. Run
      `npx prisma db push && npx prisma generate` before task-39.
- [x] task-39 (API) — bot webhook, link-status poll, manual-code verify
      routes. Built 2026-09-07, see
      docs/tasks/task-39-api-telegram-webhook-and-link.md. Also added
      `TelegramPendingLink` schema model (addendum, not in task-38) —
      run `npx prisma db push && npx prisma generate` again before
      task-40. Flags a spec deviation (optional TELEGRAM_WEBHOOK_SECRET)
      for developer review.
- [x] task-40 (UI) — re-enabled Telegram step in RecoverySetupWizard.tsx
      (deep link + polling + manual-code fallback). Built 2026-09-07,
      see docs/tasks/task-40-ui-wire-telegram-step.md.
- [DONE] task-41 (middleware) — security-question route now checks
      all 3 steps and flips recoverySetupComplete = true; middleware.ts
      gates every /buyer/* route behind it via lib/recoverySetup.ts.
      Built 2026-09-07, see docs/tasks/task-41-recovery-setup-gate.md.
      NOTE: this task number collides with item 4's "task-41 — Analytics"
      below — see NOTES at the bottom of this file, unresolved pending
      developer renumbering decision.
- [~] task-36 — `/auth/forgot-password` flow — split into task-66
      through task-70 (schema/API-verify/API-reset/UI-forgot-password/
      UI-reset-password, per Rule 49 Step 4: bundles 3+ distinct
      sub-features across schema+API+UI layers), same pattern as the
      task-38→41 Telegram split. task-37 folded into this split
      (API-reset = old task-37's reset-page backend + session
      invalidation; UI-reset-password = old task-37's page).
  - [DONE] task-66 (schema + lib) — forgotPasswordOtp*/
        forgotPasswordResetToken* fields on BuyerRecovery +
        lib/passwordResetToken.ts. Built 2026-09-07, see
        docs/tasks/task-66-forgot-password-schema.md. Run
        `npx prisma db push && npx prisma generate` before task-67.
  - [DONE] task-67 (API) — /api/auth/forgot-password/initiate + /verify
        (all 3 methods) + rate limiting (per-IP and per-account,
        combined) + SecurityLog + Gatekeeper strike wiring. Built
        2026-09-07, see docs/tasks/task-67-forgot-password-api.md.
  - [DONE] task-68 (API) — /api/auth/forgot-password/reset + session
        invalidation (Rule 44). Built 2026-09-07, see
        docs/tasks/task-68-forgot-password-reset-api.md.
  - [ ] task-69 (UI) — /auth/forgot-password page (identify → pick
        method → verify, one wizard component)
  - [ ] task-70 (UI) — /auth/reset-password page

---

## PHASE 3 (remainder) — ADMIN & SUPER-ADMIN OVERSIGHT

### [~] 4. admin_account_specification.md — Product CRUD done; rest not started
- [ ] task-38 — Admin dashboard (Section 3.1)
- [ ] task-39 — Orders management (Section 3.3)
- [ ] task-40 — Users management (Section 3.4)
- [ ] task-41 — Analytics (Section 3.5) — depends on item 11's traffic table
- [ ] task-42 — Admin Security Logs page (Section 3.6) — reuses Rule 38.9
      pattern already designed for super-admin; confirm if admin gets a
      scoped view or the same page with permission check
- [ ] task-43 — Admin Vault page (Section 3.7) — depends on task-32
- [ ] task-44 — Admin Profile page (Section 3.8)

### [~] 5. super_admin_account_specification.md
- [ ] task-45 — Security Logs page (Section 3.3, Rule 38.9) — DataTable,
      filters, export, expandable rows
- [ ] task-46 — Account Activity page (Section 3.4, Rule 42.3)
- [DONE] task-33 (shared, see Phase 4) — Gatekeeper/device-bans page (Section
      3's note bundling gatekeeper_specification.md into this phase)
- [ ] task-47 — Phase 1: 2FA/TOTP enrollment (flagged as missing even though
      later phases are already built — not blocking, but should not be
      skipped indefinitely)
- [ ] task-48+ — Phases 3+: admin management, vault, buyer management
      (break down further once task-47 scope is confirmed)

---

## PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES

### [ ] 10. bulk_file_converter_and_pdf_renamer_specification.md
- [ ] task-49 — Read spec fully and break into schema/API/UI micro-tasks
      once this phase is picked up (not detailed yet — lower priority per
      Section 5C's own ordering)

---

## PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING

### [ ] 11. sitewide_technical_seo_specification.md
- [ ] task-50 — Sitemap/robots.txt
- [ ] task-51 — Global 404/error boundaries (Rule 31.10 pattern)
- [ ] task-52 — Idle session timeout (Rule 32.5) — apply per account layout
- [ ] task-53 — Anonymized traffic analytics (Rule 41) — `PageViewDaily`
      table + super-admin Analytics dashboard (feeds task-41 above)

### [ ] 12. additional_platform_gaps_specification.md
- [ ] task-54 — Coupons (needs Phase 1 checkout totals — already available)
- [ ] task-55 — Refund processing (needs Order.status — already available)
- [ ] task-56 — OAuth login
- [ ] task-57 — Buyer 2FA
- [ ] task-58 — Transactional emails
- [ ] task-59 — Shop filtering
- [ ] task-60 — Dev env setup docs

### [ ] 13. infra_ops_specification.md
- [ ] task-61 — CI/CD pipeline
- [ ] task-62 — Error tracking (Sentry)
- [ ] task-63 — Security headers / CSP
- [ ] task-64 — Blog CMS admin

---

## NOTES

- **UNRESOLVED — task-41 numbering collision (flagged 2026-09-07):**
  `task-41` was used twice in this file — once under item 8
  (buyer_password_recovery_specification.md, middleware gate, now
  [DONE], see docs/tasks/task-41-recovery-setup-gate.md) and once
  under item 4 (admin_account_specification.md, Analytics, still
  [ ] and blocked on task-53's traffic table). Developer confirmed
  the item 8 one should proceed under the number 41. **Reserved
  number for the Analytics task: `task-65`** (reserved, not yet
  built — do not reuse) — chosen so it doesn't collide with the
  task-66 through task-70 range just minted below for the
  forgot-password split. Do not create docs/tasks/task-41-analytics.md
  under the old number; use task-65 whenever that item is picked up.
- Task numbering continues from the highest existing file (`task-27`) —
  next new task file is `task-28`.
- `task-33` is listed under both item 6 and item 7 deliberately — it is
  one deliverable (Gatekeeper/Emergency Actions backend + viewer page)
  that closes gaps in two specs simultaneously. Build once, check off both.
- Per Rule 8A, work proceeds one (micro-)task at a time with a checkpoint
  after each. This file and `overviewProject.txt` Section 5C / CHANGE LOG
  are updated the same turn any task's status changes.
- Excluded from this plan (per Section 5C's own exclusion list, unchanged):
  `login_vault_page_secret_key_generation.md` (superseded design),
  `tier1_free_trial_subscription_specification.md` and
  `trial_tracking_and_developer_notifications_specification.md` (separate
  codebase), `villa-azure-agreement-v8-DRAFT-with-trial.txt` (contract, not
  a spec).
