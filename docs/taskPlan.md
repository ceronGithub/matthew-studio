# MASTER TASK PLAN — matthew-studio (shop branch)

**NEXT UP:** task-109 — schema: add `pending-review` to `Product.status`
(Phase 6, product approval flow — first of a 4-task split, see below).

Phase 6 audit (Section 9.2 approval flow) completed this pass:
Spec ✅ / Schema ❌ / Code Wired ❌ — `Product.status` only supports
`draft`/`published`, no `/superAdmin/products` route exists, no
`pending-review` references anywhere in the codebase. Split into
task-109 through task-112 per Rule 49 Step 4 (spans schema + 2 API
surfaces + UI). Phase 4 and Phase 5 remain fully [DONE] (task-100
through task-108 closed). Phases 7-10 remain unaudited.

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

### [DONE] 6. vault_specification.md — CLOSED 2026-09-07, all micro-tasks (28-33) done
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

### [DONE] 8. buyer_password_recovery_specification.md — CLOSED 2026-09-07 (task-70)
- [DONE] task-34 — Data model additions (recoverySetupComplete, telegramChatId,
      securityQuestionId/Hash fields per Rule 48.2) + Telegram bot env vars.
      Built as a new `BuyerRecovery` table (userId-keyed) rather than the
      spec's literal `model Buyer` block, since this repo has no local
      Buyer/User table — see prisma/schema.prisma header comment and
      overviewProject-2.txt's 2026-09-07 entry. Traceability file was
      missing (numbering gap, no code gap) — back-filled 2026-09-07 via
      Rule 49.1 reconciliation, see
      docs/tasks/task-34-buyer-recovery-schema.md.
- [DONE] task-35 (email + security-question half) — `/auth/register/
      recovery-setup` wizard: Email OTP (send/verify) + Security
      Question steps, `RegisterForm` now redirects there post-signup.
      Built 2026-09-07, see docs/tasks/task-35-email-security-question.md.
- [DONE] task-35 (Telegram half, remaining) — split into task-38 through
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
      [Rule 6 auto-sync, 2026-09-08: task-35 (Telegram half) and
      task-36 above were both left at [ ]/[~] even though every one of
      their listed children (task-38 through task-41, task-66 through
      task-70) was already [DONE]/[x] — flipped both parent lines to
      [DONE] on sight during this session's Step -1 audit.]
- [DONE] task-36 — `/auth/forgot-password` flow — split into task-66
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
  - [DONE] task-69 (UI) — /auth/forgot-password page (identify → pick
        method → verify → done, one wizard component). Retired the
        legacy Supabase-native ForgotPasswordForm + its API route
        (developer confirmed: replace, don't run a parallel URL).
        Built 2026-09-07, see
        docs/tasks/task-69-ui-forgot-password-page.md. NOTE: links to
        /auth/reset-password?token=... which task-70 hasn't wired up
        yet — placeholder handoff until then.
  - [DONE] task-70 (UI) — /auth/reset-password page: reads `?token=`
        via useSearchParams (wrapped in Suspense), submits to
        task-68's /api/auth/forgot-password/reset. Replaced the
        legacy Supabase-session ResetPasswordForm and retired the
        now-dead app/api/auth/reset-password/route.ts logging-only
        route (only caller was the file just replaced). Closes
        buyer_password_recovery_specification.md end to end
        (task-66 through task-70 all DONE).

---

## PHASE 3 (remainder) — ADMIN & SUPER-ADMIN OVERSIGHT

### [DONE] 4. admin_account_specification.md — CLOSED 2026-09-08, all items (dashboard, orders, users, analytics, vault, security logs, profile) done
- [DONE] task-71 — Admin dashboard (Section 3.1) — renumbered 2026-09-07 from
      task-38, which collided with the (already DONE) buyer-recovery
      Telegram schema task of the same number; see NOTES. Built
      2026-09-07: Quick Stats, Alerts (pending orders only —
      inventory/promotions alerts not applicable, no such models
      exist), Recent Orders + Recent Products, Quick Actions. See
      overviewProject-2.txt's 2026-09-07 CHANGE LOG entry.
- [DONE] task-72 — Order management (Section 3.3) — split into task-74
      through task-82 per Rule 49 Step 4 (spans schema+API+UI across
      5+ distinct sub-features: list, detail, status/refund/notes,
      buyer email, t-shirt production tracking), same pattern as the
      task-36→66-70 and task-35(remaining)→38-41 splits above.
  - [DONE] task-74 (schema) — Order.statusHistory / internalNotes /
        refundReason / refundedAt fields. Built 2026-09-07, see
        docs/tasks/task-74-orders-schema.md. Run
        `npx prisma db push && npx prisma generate` before task-75.
  - [DONE] task-75 (API) — GET /api/admin/orders — list, filter
        (status/date range/search by ID or guest email), pagination
        (25/page), CSV export (format=csv, capped 5000 rows) (Section
        3.3.1). Built 2026-09-07, see
        docs/tasks/task-75-api-admin-orders-list.md. Note: registered-
        buyer email search isn't feasible server-side without scanning
        all Supabase Auth users, so search is limited to order ID +
        guest email — flagged in the route's own comments.
  - [DONE] task-76 (API) — GET /api/admin/orders/[orderId] — full detail
        (buyer info via Supabase Auth, items joined to Product for
        category, payment, timeline derived from statusHistory,
        internal notes, refund/shipping/production-stage fields)
        (Section 3.3.2 #1-5). Built 2026-09-07, see
        docs/tasks/task-76-api-admin-order-detail.md.
  - [DONE] task-77 (API) — POST /api/admin/orders/[orderId]/actions —
        `action` discriminator for update_status (+statusHistory
        entry+SecurityLog+notification), refund (+refundReason/
        refundedAt+status→Cancelled+notification), add_note
        (internalNotes entry, never notifies) — grouped as one task,
        same precedent as task-30's grouped vault routes (Section
        3.3.1 Row Actions / 3.3.2 Actions). Built 2026-09-07, see
        docs/tasks/task-77-api-admin-order-actions.md. Notifications
        skipped for guest orders (no userId to notify).
  - [DONE] task-78 (API) — POST /api/admin/orders/[orderId]/send-email
        — custom buyer email via one shared EmailJS template
        (EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL) with a preset-subject
        variable rather than one template per preset (Section 3.3.1
        Row Actions). Works for guest orders too (email doesn't
        require an account). Built 2026-09-07, see
        docs/tasks/task-78-api-admin-order-send-email.md. New env var:
        EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL — needs to be created in
        the EmailJS dashboard and added to .env/.env.local.
  - [DONE] task-79 (API) — PATCH .../production-stage — advance/revert
        t-shirt stage (revert requires note, direction computed
        server-side from pipeline position — never trusts a
        client-supplied isRevert flag), optional R2 proof-photo
        attach (quality_check/packed only), auto-syncs top-level
        status to "Shipped" + buyer notification when stage reaches
        shipped, SecurityLog `order_production_stage_updated`
        (Section 3.3.3). Built 2026-09-07, see
        docs/tasks/task-79-api-admin-order-production-stage.md.
  - [DONE] task-80 (UI) — /admin/orders list page: table, filters,
        status badges, bulk actions, CSV export button, row actions
        (Section 3.3.1). Built 2026-09-07, see
        docs/tasks/task-80-ui-admin-orders-list.md. Bulk status update
        fans out to the existing per-order actions endpoint (task-77)
        rather than a new bulk API route — UI-only scope per Rule 49
        Step 4.
  - [DONE] task-81 (UI) — /admin/orders/[orderId] detail page: header,
        buyer/payment/shipping cards, items table, status timeline,
        internal notes, update-status/refund (behind
        ConfirmationModal)/add-note/send-email actions wired to
        task-76/77/78 (Section 3.3.2). Built 2026-09-07, see
        docs/tasks/task-81-ui-admin-order-detail.md.
  - [DONE] task-82 (UI) — T-shirt production tracker component
        (horizontal stepper, advance/revert modals with required
        revert note, photo upload) embedded in task-81's page,
        `tshirts`-category orders only (Section 3.3.3). Built
        2026-09-07, see docs/tasks/task-82-ui-production-tracker.md.
- [DONE] task-73 — Users management (Section 3.4) — CLOSED 2026-09-08,
      all micro-tasks (83-88) done — renumbered 2026-09-07
      from task-40, same Telegram-split collision; see NOTES. Split
      into task-83 through task-88 per Rule 49 Step 4 (spans
      schema+API+UI across 6 distinct sub-features: list, detail,
      deactivate/reactivate, reset-password, send-email/add-note,
      same pattern as the task-72→74-82 and task-36→66-70 splits
      above). No local Buyer/User table exists — buyers are Supabase
      Auth users, same constraint task-34/76 already worked around.
  - [DONE] task-83 (schema) — `BuyerAdminMeta` model (userId-keyed,
        `internalNotes` Json array, same shape/convention as
        `Order.internalNotes`). Deliberately does NOT add an
        active/inactive flag — deactivation reuses Supabase Admin
        API's own `ban_duration` (task-86) rather than a second
        source of truth. Password-reset needs no new fields either —
        reuses `BuyerRecovery.forgotPasswordResetTokenHash`/
        `ExpiresAt` (task-66) with an admin-initiated token instead of
        a buyer-verified one. Built 2026-09-07, see
        docs/tasks/task-83-schema-buyer-admin-meta.md. Run
        `npx prisma db push && npx prisma generate` before task-84.
  - [DONE] task-84 (API) — GET /api/admin/users — list: merges Supabase
        Auth users with per-buyer Order aggregates (total orders,
        lifetime value) via one groupBy query; filters
        (status/date range/search), pagination, CSV export
        (Section 3.4.1). Built 2026-09-07, see
        docs/tasks/task-84-api-admin-users-list.md.
  - [DONE] task-85 (API) — GET /api/admin/users/[buyerId] — detail:
        account info + last login/IP/city from SecurityLog, 5 most
        recent orders, last 10 AccountActivityLog entries, internal
        notes (Section 3.4.2 Display Sections 1-3). Built 2026-09-08,
        see docs/tasks/task-85-api-admin-user-detail.md. Flags a known
        gap: recordAccountActivity() isn't wired into any buyer layout
        yet, so the Account Activity section returns empty until that
        instrumentation lands.
  - [DONE] task-86 (API) — POST /api/admin/users/[buyerId]/actions —
        `action` discriminator: deactivate/reactivate (Supabase
        `ban_duration`), reset_password (admin-initiated reset token
        + EmailJS, reuses task-66/68's fields/helpers), send_email
        (EmailJS, new EMAILJS_TEMPLATE_ID_ADMIN_BUYER_EMAIL template
        rather than reusing task-78's order-scoped one), add_note
        (BuyerAdminMeta.internalNotes, upserted) — grouped per
        task-30/77 precedent (Section 3.4.1 Row Actions / 3.4.2
        Actions). Built 2026-09-08, see
        docs/tasks/task-86-api-admin-user-actions.md. New env vars:
        APP_URL, EMAILJS_TEMPLATE_ID_ADMIN_PASSWORD_RESET,
        EMAILJS_TEMPLATE_ID_ADMIN_BUYER_EMAIL. Extracted
        lib/getBuyerAuthUser.ts, shared with (and now used by) task-85.
  - [DONE] task-87 (UI) — /admin/users list page: table, filters, bulk
        deactivate/reactivate + CSV export (Section 3.4.1). Built
        2026-09-08, see docs/tasks/task-87-ui-admin-users-list.md.
        Corrected here 2026-09-08 — this line was stale (still `[ ]`)
        even though the file itself already said DONE; Layer-3
        confirmed live before flipping, per Rule 49.1.
  - [DONE] task-88 (UI) — /admin/users/[buyerId] detail page: account
        info, order history, activity trail, notes, action buttons
        wired to task-86 (Section 3.4.2). Built 2026-09-08, see
        docs/tasks/task-88-ui-admin-user-detail.md.
- [DONE] task-65 — Analytics (Section 3.5) — depended on item 11's traffic
      table (already renumbered from task-41 per prior NOTES entry);
      that table is now DONE (task-89/90/91) so this item unblocked
      and was split into task-92/task-93 per Rule 49 Step 4 (spans
      API + UI layers):
  - [DONE] task-92 (API) — `GET /api/admin/analytics`: getSessionAdmin()
        auth + "view-analytics" permission check, days/categories
        query params, delegates to `lib/adminAnalyticsStats.ts`. Built
        and committed ("done task 92") but never given a docs/tasks/
        file or reflected in this taskPlan — reconciled 2026-09-08 per
        Rule 49.1 (Layer-3 confirmed live and non-stub via the route's
        own header comment, which names task-92/task-93 explicitly).
        See docs/tasks/task-92-api-admin-analytics.md (back-filled).
  - [DONE] task-93 (UI) — `app/admin/analytics/page.tsx` +
        `components/admin/AdminAnalytics.tsx` +
        `lib/hooks/useAdminAnalytics.ts`, reading from task-92's
        route. Built 2026-09-08 — did not meet the micro-task split
        threshold (single file set, single UI layer, single role), so
        built as one task per Rule 49.1.
- [DONE] task-42 — Admin Security Logs page (Section 3.6). API half
      already done as part of task-45's API work — see
      docs/tasks/task-45-api-security-logs.md. UI half built
      2026-09-08: `lib/hooks/useAdminSecurityLogs.ts` +
      `components/security-logs/AdminSecurityLogsList.tsx` (reuses
      `SecurityLogRow` per Rule 2 — no rewrite) + `app/admin/security-
      logs/page.tsx`, restricted to the Event Type + Date Range
      filters Section 3.6 calls for (no device/country filter, no CSV
      export — those stay super-admin-only extras). Quick Action link
      added to `app/admin/dashboard/page.tsx`. Self-scoped server-side
      via `WHERE actor = currentAdmin.email` (Section 3.6's own
      wording) — never relies on frontend filtering. See
      docs/tasks/task-42-ui-admin-security-logs.md.
- [DONE] task-43 — Admin Vault page (Section 3.7) — reconciled 2026-09-08:
      already satisfied by task-32, which built both
      `/superAdmin/vault/[slug]` and `/admin/vault/[slug]`
      (`app/admin/vault/page.tsx` + `app/admin/vault/[slug]/page.tsx`
      confirmed live on disk). This line was stale — task-32 already
      covered this scope, it just wasn't cross-referenced here.
- [DONE] task-44 (API half) — Admin Profile settings: GET/PUT
      `/api/admin/profile` (fullName, read-only email/role/
      permissions/createdAt, notificationPrefs), `POST
      /api/admin/profile/avatar` (R2 upload, mirrors buyer's),
      `PUT /api/admin/profile/password` (current-password
      verification via signInWithPassword, then Supabase
      updateUserById), `PUT /api/admin/profile/notifications`
      (single-toggle save). Built 2026-09-08, see
      docs/tasks/task-44-api-admin-profile.md.
- [DONE] task-44 (UI half) — `/admin/profile` page + form components,
      same shape as the buyer profile page. Built 2026-09-08:
      `lib/hooks/useAdminProfile.ts` + `components/admin/ProfileForm.tsx`
      + `app/admin/profile/page.tsx` + `app/styles/adminProfile.css`,
      wired to task-44 (API half)'s four routes. Three sections per
      Section 3.8: Profile Information (name/avatar/read-only role &
      permissions), Change Password (current-password re-entry,
      client-side strength pre-check mirroring the server rule),
      Notification Preferences (each toggle saves immediately, no
      batch save). Quick Action link added to
      `app/admin/dashboard/page.tsx`. This was the last remaining line
      in item 4 — parent flipped to [DONE] same turn per Rule 49.1
      Rule 6. See docs/tasks/task-44-ui-admin-profile.md.

### [~] 5. super_admin_account_specification.md
- [DONE] task-45 (API half) — lib/securityLogsQuery.ts (shared query,
      optional actorEmail param) + GET /api/superadmin/security-logs
      (unscoped). Built 2026-09-08, see
      docs/tasks/task-45-api-security-logs.md.
- [DONE] task-45 (UI half) — /superAdmin/security-logs viewer page:
      DataTable, filters (eventType/deviceType/geoCountry/date range),
      CSV export, expandable rows (Section 3.3, Rule 38.9) — built
      2026-09-08, see docs/tasks/task-45-ui-security-logs.md. Also
      extended lib/securityLogsQuery.ts + the superadmin route with
      deviceType/geoCountry params, which the API half's original
      scope hadn't covered — needed to satisfy Section 3.3's full
      filter list.
- [DONE] task-46 — Account Activity page (Section 3.4, Rule 42.3) —
      lib/accountActivityQuery.ts (paginated/filterable query +
      distinct-accounts lookup) + GET
      /api/superadmin/account-activity (superAdmin-only) +
      lib/hooks/useAccountActivity.ts +
      components/account-activity/{AccountActivityList,
      AccountActivityRow}.tsx + /superAdmin/account-activity page +
      app/styles/accountActivity.css. No schema change — read/display
      path only, AccountActivityLog + recordAccountActivity() were
      already live. Built 2026-09-08, see
      docs/tasks/task-46-account-activity-page.md.
- [DONE] task-33 (shared, see Phase 4) — Gatekeeper/device-bans page (Section
      3's note bundling gatekeeper_specification.md into this phase)
- [DONE] task-47 — Phase 1: 2FA/TOTP enrollment. Broken into 6 micro-tasks
      2026-09-08 (Rule 49 Step 4 — touches 4+ layers): see
      docs/tasks/task-47-*.md. All 6 parts closed 2026-09-12 (Rule 6
      parent auto-sync — flipped the same turn the last child closed).
      - [DONE] task-47-schema-totp — AdminTotpCredential model + otplib/qrcode deps
      - [DONE] task-47-api-totp-enroll — enrollment API (generate + verify) —
            built 2026-09-08 at app/api/auth/totp/enroll/route.ts (not
            /api/admin/* as originally scoped — see
            docs/tasks/task-47-api-totp-enroll.md for why)
      - [DONE] task-47-api-totp-login-verify — login flow TOTP gate + verify
            endpoint, built 2026-09-08: app/api/auth/login/route.ts now
            issues a pending token instead of a session for TOTP-enabled
            accounts; new POST /api/auth/totp/verify-login confirms the
            code and grants the session via lib/loginSession.ts (shared
            with the non-2FA path) — see
            docs/tasks/task-47-api-totp-login-verify.md and
            overviewProject-3.txt's matching CHANGE LOG entry
      - [DONE] task-47-ui-totp-enrollment — enrollment screen, built
            2026-09-12: app/admin/security/totp-setup/page.tsx +
            components/admin/TotpEnrollmentForm.tsx +
            lib/hooks/useTotpEnrollment.ts — see
            docs/tasks/task-47-ui-totp-enrollment.md
      - [DONE] task-47-ui-totp-login-step — login page TOTP prompt, built
            2026-09-12: components/auth/SignInForm.tsx now switches to
            components/auth/TotpLoginStep.tsx (new) when the login
            response signals totpRequired — see
            docs/tasks/task-47-ui-totp-login-step.md
      - [DONE] task-47-totp-setup-gate — middleware forced-enrollment redirect,
            built 2026-09-12: new `lib/totpSetup.ts` (`isTotpEnrolled()`,
            fail-open on DB error, mirrors lib/recoverySetup.ts) + new
            branch in middleware.ts, right after the admin/superAdmin
            role checks, redirecting to /admin/security/totp-setup when
            AdminTotpCredential.enabled is false — see
            docs/tasks/task-47-totp-setup-gate.md
- [~] task-48+ — super_admin_account_specification.md Phases 3-10
      (corrected 2026-09-12 — old text said "admin management, vault,
      buyer management" as one lump; verified against the spec's own
      Phase summary table + actual code, since vault is already [DONE]
      under item 6 above and doesn't belong in this remaining list):
  - [DONE] Phase 3 — Admin Management (Section 3.2, `/superAdmin/
        admin-management/*`) — all 6 parts closed (task-99, 94, 95,
        96, 97, 98). Auto-flipped to [DONE] the same turn task-98
        closed, per Rule 6 (parent checkbox auto-sync) — every listed
        child below is [DONE], none partial.
      - [DONE] task-99 — API: POST /api/admin/create-admin (Section 3.2.2
            — create Supabase user w/ role=admin + permissions in
            user_metadata, temp password, EmailJS credentials email,
            `admin_created` SecurityLog event). Renumbered from task-93
            to task-99 this pass — task-93 was already used and closed
            2026-09-08 for the admin analytics UI (see item 4/task-65's
            split above); the Phase 3 Admin Management split that
            minted 93-98 didn't check against that prior use. task-94
            through task-98 below are unaffected (checked, no
            collision). Built 2026-09-12, see
            docs/tasks/task-99-api-create-admin.md. New env var:
            EMAILJS_TEMPLATE_ID_ADMIN_ACCOUNT_CREATED — needs to be
            created in the EmailJS dashboard and added to
            .env/.env.local.
      - [DONE] task-94 — API: GET /api/superadmin/admin-management
            (list, paginated/filtered, CSV export) + GET
            /api/superadmin/admin-management/[adminId] (detail) —
            Section 3.2.1/3.2.3. New: lib/getAdminAuthUser.ts (role-
            "admin" lookup, mirrors lib/getBuyerAuthUser.ts) and
            lib/adminAccountStatus.ts (active/inactive/locked). Built
            2026-09-12, see docs/tasks/task-94-api-admin-management-
            list-detail.md. GAP FOUND & FIXED: task-99's create-admin
            route never persisted createdBy in user_metadata even
            though its own JSON response already returned it — added
            createdBy: admin.email to that route's user_metadata so
            task-94's detail endpoint has real data going forward;
            admins created before this fix show createdBy: null.
            GAP FOUND, NOT FIXED (out of scope — read-only task):
            Section 5.3's "locked after 5 failures, 1-hour auto-
            recovery" has no stored field and app/api/auth/login/
            route.ts does not actually block logins once reached —
            "Locked" status here is display-only, computed live from
            SecurityLog login_failed counts (lib/adminAccountStatus.ts
            header has the full note). Enforcing the actual block is a
            separate task, not yet numbered.
      - [DONE] task-95 — API: admin actions — edit (name/permissions),
            deactivate/reactivate, reset-password, delete (Section
            3.2.1/3.2.3, 5-second-delay confirmation on delete per
            Rule 34.4) — built 2026-09-12: PATCH/DELETE added to
            app/api/superadmin/admin-management/[adminId]/route.ts,
            plus two new sub-routes, ./toggle-status/route.ts and
            ./reset-password/route.ts. Reset-password does NOT reuse
            BuyerRecovery (buyer-specific, no admin equivalent exists)
            — it rotates the admin's Supabase password directly and
            emails the new temp password, same pattern as
            create-admin's own flow. New required env var:
            EMAILJS_TEMPLATE_ID_SUPERADMIN_ADMIN_PASSWORD_RESET
            (distinct template from the buyer-facing
            EMAILJS_TEMPLATE_ID_ADMIN_PASSWORD_RESET — not yet created
            in the EmailJS dashboard, flagged for the developer).
      - [DONE] task-96 — UI: `/superAdmin/admin-management` list page —
            DataTable, filters, CSV export, row actions (Section 3.2.1).
            Built: lib/hooks/useAdminManagement.ts,
            components/admin/AdminManagementList.tsx,
            app/superAdmin/admin-management/page.tsx,
            app/styles/adminManagement.css. Extended the shared
            ConfirmationModal with an optional confirmDelaySeconds prop
            (backward-compatible, all 15 prior callers unaffected) for
            Delete's required 5-second delay. Status shown as a colored
            dot + label rather than the spec's literal emoji glyphs, per
            Rule 17.3. View/Edit link to task-98's not-yet-built route,
            same precedent as AdminUsersList → task-88. CORRECTION
            (2026-09-13, made while closing task-97): task-96's own
            scope required a "Create Admin" toolbar button linking to
            this task's page — missed in the initial build, added now
            that task-97 exists (see task-97's own entry below).
      - [DONE] task-97 — UI: `/superAdmin/admin-management/create` page —
            form w/ permission checkboxes (Section 3.2.2). Built:
            lib/hooks/useCreateAdminForm.ts,
            components/admin/CreateAdminForm.tsx,
            app/superAdmin/admin-management/create/page.tsx,
            app/styles/adminManagementCreate.css. Plain useState +
            validate() pattern (no react-hook-form/zod anywhere in this
            codebase — see AdminProductForm.tsx's own header note).
            409 email-conflict surfaces as an inline Email field error,
            never a banner. On success: toast + a 900ms-delayed
            redirect to /superAdmin/admin-management/[newAdminId]
            (same precedent as useBuyerOrderDetail.ts's reorder()).
            Also wired AdminManagementList.tsx's missing "Create Admin"
            toolbar button (task-96's own scope, corrected above) to
            this page.
      - [DONE] task-98 — UI: `/superAdmin/admin-management/[adminId]/edit`
            page — combined view + edit (Section 3.2.3). Built:
            lib/hooks/useAdminManagementDetail.ts,
            components/admin/AdminManagementDetail.tsx,
            app/superAdmin/admin-management/[adminId]/edit/page.tsx,
            app/styles/adminManagementDetail.css, wired to task-94's
            GET detail route and task-95's PATCH/toggle-status/
            reset-password routes. Reuses useCreateAdminForm.ts's
            PERMISSION_OPTIONS so labels can't drift out of sync with
            the create form. Section 3.2.3 lists an editable "status
            toggle" and a separate "Deactivate Account" button as two
            bullets; since the API only exposes one deactivate/
            reactivate action (no separate status field on the PATCH
            route), both are implemented as a single status card with
            one Deactivate/Reactivate button behind ConfirmationModal
            — not two controls that could disagree. Save Changes only
            ever touches name/permissions; status changes go through
            their own confirmation + immediate API call, same as every
            other status toggle in the app. FIXED IN PASSING (same
            precedent as task-97 fixing task-96's missed button): the
            list page's separate "View" link (pointing at a bare
            `[adminId]` route that was never built and isn't in this
            spec) was replaced with a single "View / Edit" link to
            this page; useCreateAdminForm.ts's post-create redirect
            was corrected from `[adminId]` to `[adminId]/edit`. Client-
            side notFound state (not Rule 31.10's server notFound())
            used for consistency with AdminUserDetail.tsx, the
            established sibling pattern for admin detail pages.
  - [DONE] Phase 4 (remainder) — Backups (Rule 40) — all 6 micro-tasks
        (task-100 through task-105) now closed; vault half of this
        phase was already [DONE] (item 6 above). CORRECTION this pass:
        the prior "Section 3.5" citation here was a mislabel copied
        from the Analytics line above — no spec doc defines a
        Backups section; `infra_ops_specification.md` §4.1 only
        cross-references Rule 40.5 in passing. Rule 40 itself is the
        spec of record for this phase (see each task-N file's
        "Fulfills spec" header). Split into 6 micro-tasks per Rule 49
        Step 4 (spans schema + services + a standalone script + CI +
        API + UI):
        - [DONE] task-100 — schema: `BackupLog` model. Added to
              prisma/schema.prisma with @@index([status]) and
              @@index([startedAt]) beyond the base Rule 40.4 spec, to
              support task-105's filterable admin table. See
              docs/tasks/task-100-schema-backuplog.md.
        - [DONE] task-101 — services: Google Drive upload helper.
              Added services/googleDrive.ts (uploadToDrive/
              deleteFromDrive); services/r2.ts already existed and
              needed no changes. Requires `npm install googleapis`
              (not yet run — see Run in terminal). See
              docs/tasks/task-101-services-google-drive.md.
        - [DONE] task-102 — script: `scripts/runBackup.ts` (DEVIATION:
              `.ts` not `.js` — this is a TS Next.js project, run via
              `tsx`, added as a devDependency, so it can import the
              existing typed services/prisma.ts, services/r2.ts,
              services/googleDrive.ts directly). `npm run backup`
              wired in package.json. `npx tsc --noEmit` shows zero
              errors in this file (only pre-existing, unrelated
              Prisma-client-generation errors remain elsewhere, same
              sandbox restriction noted on task-98's entry). Not
              smoke-tested end-to-end — no live DIRECT_URL/R2/Drive
              credentials or pg_dump binary available in this
              environment; verification steps are in the task file.
              See docs/tasks/task-102-script-run-backup.md.
        - [DONE] task-103 — CI: `.github/workflows/database-backup.yml`
              added — nightly cron (18:00 UTC, flagged for timezone
              confirmation) + `workflow_dispatch` for manual on-demand
              runs (Rule 40.6 — never a button in the app itself).
              Installs `postgresql-client` on the runner for `pg_dump`
              since it isn't preinstalled. YAML validated. Requires 9
              GitHub Actions repo secrets to be set (see task file) —
              not yet configured, cannot be tested from this sandbox.
              See docs/tasks/task-103-ci-backup-workflow.md.
        - [DONE] task-104 — API: `GET /api/superadmin/backups`
              (CORRECTED path — its own task file said `superAdmin`
              camelCase, but every existing super-admin route in this
              repo lives under lowercase `app/api/superadmin/`; fixed
              to match rather than introduce a second, inconsistent
              folder). Added `lib/backupsQuery.ts` alongside it,
              mirroring `lib/accountActivityQuery.ts`'s shape. Same
              `getSessionAdmin` + `role === "superAdmin"` guard as the
              other super-admin routes. Strictly read-only — no POST
              handler. `npx tsc --noEmit` shows zero errors in either
              new file. See docs/tasks/task-104-api-admin-backups-list.md.
        - [DONE] task-105 — UI: `/superAdmin/backups` page. Added
              `lib/hooks/useBackups.ts`, `components/backups/BackupRow.tsx`,
              `components/backups/BackupsList.tsx`,
              `app/superAdmin/backups/page.tsx`, `app/styles/backups.css` —
              same Server/Client split, DataTable+status-badge pattern,
              and Rule 25 loading/empty/error states as
              security-logs/account-activity pages. Status badge is
              3-state (success/failed/running) per Rule 40.6. Strictly
              read-only — no "Run Backup Now" button; wired to the
              existing task-104 API only. Also added a "Backups" entry
              to the dashboard's QUICK_ACTIONS list so it's discoverable,
              matching every other Phase 2-4 page. `npx tsc --noEmit`
              shows zero errors in any new/changed file (pre-existing
              errors elsewhere are unrelated — this sandbox couldn't
              fetch the Prisma engine binary to fully regenerate the
              client; verify with a clean `npx prisma generate` in a
              real dev environment). See
              docs/tasks/task-105-ui-admin-backups-page.md.
  - [DONE] Phase 5 — Buyer Management (Section 3.8, `/superAdmin/
        buyer-management/*`) — distinct from admin_account_
        specification.md's task-84-88 (that's the regular ADMIN role's
        own buyer list, `/api/admin/users`); this is the SUPER-ADMIN's
        own list/deactivate/reactivate/reset/delete page. All 3
        micro-tasks now closed (task-106, 107, 108). Auto-flipped to
        [DONE] the same turn task-108 closed, per Rule 6 (parent
        checkbox auto-sync) — every listed child below is [DONE],
        none partial. Split into 3 micro-tasks per Rule 49 Step 4
        (spans API + UI, 3+ distinct sub-features: list, detail,
        delete):
        - [DONE] task-106 — API: add "delete" action to the existing
              `app/api/admin/users/[buyerId]/actions/route.ts`
              (extends, doesn't duplicate — Supabase Auth
              deleteUser + soft-deletes owned Orders per Rule 6).
              See docs/tasks/task-106-api-buyer-delete-action.md.
        - [DONE] task-107 — UI: `/superAdmin/buyer-management` list page,
              mirrors `/admin/users`'s existing list pattern, reuses
              the existing list API (no new route). See
              docs/tasks/task-107-ui-buyer-management-list.md.
        - [DONE] task-108 — UI: `/superAdmin/buyer-management/[buyerId]`
              detail page, mirrors `/admin/users/[buyerId]` (reuses
              lib/hooks/useAdminUserDetail.ts as-is, extended with a
              new deleteAccount() action rather than a second hook —
              Rule 2). Delete Account button + ConfirmationModal
              (Rule 34.4, confirmDelaySeconds=5) wired to task-106;
              900ms-delayed redirect back to the list on success.
              Omits Internal Notes/Send Email (admin_account_
              specification.md's own scope, not Section 3.8). Added
              the dashboard QUICK_ACTIONS entry (folded in per
              task-105's precedent). Built 2026-09-13, see
              docs/tasks/task-108-ui-buyer-management-detail.md.
  - [~] Phase 6 — Product & Order Management w/ approval flow (Section
        3.10/3.11, 9.2) — admin_account_specification.md's own
        product/order pages (task-19-27, task-74-82) are done. Layer-3
        audit completed 2026-09-13: super-admin `pending-review`
        approval flow confirmed NOT wired (spec-only — see NEXT UP).
        Split into 4 micro-tasks per Rule 49 Step 4 (schema + 2 API
        surfaces + UI, each independently completable):
      - [ ] task-109 — schema: add `pending-review` to `Product.status`
            enum/default (Section 9.2). Migration only — no app code.
      - [ ] task-110 — API: admin product create/edit routes save as
            `pending-review` instead of `published` (extends existing
            admin product write routes from task-21). Depends on
            task-109.
      - [ ] task-111 — API: super-admin approve/reject endpoints —
            `PATCH /api/superadmin/products/[productId]/approve` and
            `.../reject`, flips status to `published` or back to
            `draft`, logs the action. Depends on task-109.
      - [ ] task-112 — UI: `/superAdmin/products` page with a
            "Pending Review" filter and approve/reject row actions
            (ConfirmationModal per Rule 34.4 on reject). Depends on
            task-110, task-111.
  - [ ] Phase 7 — CMS, Announcements, Media Library (Section 3.7/3.9,
        9.3) — not yet audited this pass.
  - [ ] Phase 8 — Task Assignment, Customer Assignment, Notifications
        (Section 3.12/3.13, 9.2/9.4) — general Notifications (task-11-
        14) are done; Task/Customer Assignment specifically not yet
        audited this pass.
  - [ ] Phase 9 — Analytics & Reporting (Section 9.5) — task-89-91
        built the Rule 41 aggregate traffic dashboard; Section 9.5's
        fuller revenue-trend + per-buyer export scope not yet audited
        this pass.
  - [ ] Phase 10 — Remaining Hardening (IP allowlist, Section 9.1) —
        not yet built.

---

## PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES

### [ ] 10. bulk_file_converter_and_pdf_renamer_specification.md
- [ ] task-49 — Read spec fully and break into schema/API/UI micro-tasks
      once this phase is picked up (not detailed yet — lower priority per
      Section 5C's own ordering)

---

## PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING

### [~] 11. sitewide_technical_seo_specification.md
- [ ] task-50 — Sitemap/robots.txt
- [ ] task-51 — Global 404/error boundaries (Rule 31.10 pattern)
- [ ] task-52 — Idle session timeout (Rule 32.5) — apply per account layout
- [DONE] task-53 — Anonymized traffic analytics (Rule 41) — `PageViewDaily`
      table + super-admin Analytics dashboard (feeds task-65 above). Split
      into task-89/90/91 per Rule 49 Step 4 (spans schema + beacon/API +
      UI — same splitting pattern as the task-72→74-82 and task-36→66-70
      splits above).
  - [DONE] task-89 — Schema: `PageViewDaily` model added (2026-09-08),
        see docs/tasks/task-89-schema-pageviewdaily.md. Run
        `npx prisma db push && npx prisma generate` before task-90.
  - [DONE] task-90 — Beacon + write path: `services/analytics.ts`
        (`recordPageView()`, never-break-the-request pattern per Rule
        41.3) + `POST /api/analytics/pageview` route + client-side
        beacon (`components/shared/AnalyticsBeacon.tsx`) mounted in
        `app/(public)/layout.tsx` only (never the authenticated
        layouts — that's AccountActivityLog/Rule 42's job). Built
        2026-09-08, see
        docs/tasks/task-90-analytics-beacon-write-path.md.
  - [DONE] task-91 — UI: super-admin Analytics dashboard page reading
        from the aggregate table only (total visits over time, top
        pages, top referrers, device breakdown, country list). Built
        2026-09-08, see docs/tasks/task-91-ui-analytics-dashboard.md.
        task-53 (and its parent item 11 sub-scope) is now fully
        closed — task-89/90/91 all done.

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

- **RESOLVED — task-93 numbering collision (found + fixed 2026-09-12):**
  `task-93` was used twice — once for the (DONE, closed 2026-09-08)
  admin analytics UI (`app/admin/analytics/page.tsx`, under item
  4/task-65's split), and again when the Phase 3 Admin Management
  split minted task-93 through task-98 this pass without checking
  against that prior use. Reconciliation: grepped `task-93` across
  this file before renumbering — task-94 through task-98 came back
  clean (no collision), so only the create-admin task needed to move.
  Renumbered the create-admin task to **task-99** (next free number
  after the 93-98 range) and renamed
  `docs/tasks/task-93-api-create-admin.md` →
  `docs/tasks/task-99-api-create-admin.md`. Do not reuse 93 for
  anything else — it stays permanently attached to the analytics UI
  task in this file's history.
- **RESOLVED — task-04/10 and task-19/23 traceability gap (found +
  fixed 2026-09-07, Rule 49.1 reconciliation):** `docs/tasks/task-04`
  through `task-10` (7 files) and `task-19` through `task-23` (5
  files) were cited by name in `overviewProject.txt`'s CHANGE LOG as
  if they existed, but were never actually written to `docs/tasks/`.
  The underlying code for all 12 was confirmed done and Layer-3
  verified (git history + Section 5C) — this was a documentation gap
  only, not unfinished work. All 12 files have been back-filled with
  the Rule 49.1 Rule 3 traceability header (spec section / phase /
  dependency) and a note marking them as reconciled after the fact.
- **RESOLVED — task-38/39/40 numbering collision (found + fixed
  2026-09-07, Rule 49.1 reconciliation):** these three numbers were
  each used twice — once for the (DONE) buyer-recovery Telegram split
  (schema/API/UI), and again for still-open Admin dashboard/Orders/
  Users management items under item 4 below. Only the sibling task-41
  collision had been caught previously. Renumbered the still-open
  admin items to task-71/72/73 (see item 4). The Telegram-split
  task-38/39/40 files are unaffected and remain as-is.
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
