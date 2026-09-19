# TASK PLAN ARCHIVE — matthew-studio (shop branch)

Append-only. Detailed history for phases/items collapsed to one line
in docs/taskPlan.md once every child task was [DONE] (Rule 49.2 §7).
Never read during a next-task lookup — only when the developer asks
about past history or a specific old entry.

---

## Archived 2026-09-20 (v60 adoption cleanup pass)

### STEP -1 AUDIT — 2026-09-06 pass (historical, corrections already applied)

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
sources confirmed live); `find app/superAdmin` (only `dashboard/` existed
at the time); `find app -ipath "*vault*"` and `*gatekeeper*` (no matches
at the time — confirmed schema-only status for both, since built out).

`overviewProject.txt` Section 5C was corrected in place at the time
(item 3 and its 4.6 sub-line flipped to `[DONE]`). Section 5C itself is
now retired per Rule 16.1 — this file's own status lines are the single
source of truth going forward.

### PHASE 4 — SECURITY & ACCESS HARDENING (items 6, 7, 8) — all CLOSED

#### [DONE] 6. vault_specification.md — CLOSED 2026-09-07, all micro-tasks (28-33) done
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
      via task-31's Layer-3 audit.
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
      filters, row expand, unban confirmation modal. Shared deliverable
      with item 7. Built 2026-09-07, see
      docs/tasks/task-33-gatekeeper-bans-api.md.

#### [DONE] 7. gatekeeper_specification.md — CLOSED 2026-09-07
- [DONE] task-33 (UI half, same as above) — viewer page + unban button wired
      to the now-live API. Instant-ban, 3-strike logic, middleware
      wiring, manual ban/unban backend, and the viewer page all done.

#### [DONE] 8. buyer_password_recovery_specification.md — CLOSED 2026-09-07 (task-70)
- [DONE] task-34 — Data model additions (recoverySetupComplete, telegramChatId,
      securityQuestionId/Hash fields per Rule 48.2) + Telegram bot env vars.
      Built as a new `BuyerRecovery` table (userId-keyed) rather than the
      spec's literal `model Buyer` block, since this repo has no local
      Buyer/User table. Traceability file back-filled 2026-09-07 via
      Rule 49.1 reconciliation. See docs/tasks/task-34-buyer-recovery-schema.md.
- [DONE] task-35 (email + security-question half) — `/auth/register/
      recovery-setup` wizard: Email OTP (send/verify) + Security
      Question steps. Built 2026-09-07, see
      docs/tasks/task-35-email-security-question.md.
- [DONE] task-35 (Telegram half) — split into task-38 through task-41.
  - [DONE] task-38 (schema+lib) — `telegramLinkToken`/`telegramOtpCodeHash`
        fields + `lib/telegramLink.ts`. See
        docs/tasks/task-38-schema-telegram-link.md.
  - [DONE] task-39 (API) — bot webhook, link-status poll, manual-code
        verify routes + `TelegramPendingLink` model. See
        docs/tasks/task-39-api-telegram-webhook-and-link.md.
  - [DONE] task-40 (UI) — Telegram step in RecoverySetupWizard.tsx. See
        docs/tasks/task-40-ui-wire-telegram-step.md.
  - [DONE] task-41 (middleware) — security-question route checks all 3
        steps, flips recoverySetupComplete, middleware.ts gates
        /buyer/* behind it. See docs/tasks/task-41-recovery-setup-gate.md.
- [DONE] task-36 — `/auth/forgot-password` flow — split into task-66
      through task-70 (schema/API-verify/API-reset/UI-forgot-password/
      UI-reset-password). task-37 folded into this split.
  - [DONE] task-66 (schema+lib) — forgotPasswordOtp*/
        forgotPasswordResetToken* fields + lib/passwordResetToken.ts.
        See docs/tasks/task-66-forgot-password-schema.md.
  - [DONE] task-67 (API) — /api/auth/forgot-password/initiate + /verify,
        rate limiting, SecurityLog + Gatekeeper strike wiring. See
        docs/tasks/task-67-forgot-password-api.md.
  - [DONE] task-68 (API) — /api/auth/forgot-password/reset + session
        invalidation (Rule 44). See
        docs/tasks/task-68-forgot-password-reset-api.md.
  - [DONE] task-69 (UI) — /auth/forgot-password wizard page, retired
        legacy Supabase-native ForgotPasswordForm. See
        docs/tasks/task-69-ui-forgot-password-page.md.
  - [DONE] task-70 (UI) — /auth/reset-password page, retired legacy
        ResetPasswordForm + dead API route. Closes
        buyer_password_recovery_specification.md end to end.

### PHASE 3 (remainder) — item 4: admin_account_specification.md — CLOSED 2026-09-08

All items (dashboard, orders, users, analytics, vault, security logs,
profile) done.
- [DONE] task-71 — Admin dashboard (Section 3.1). Renumbered from
      task-38 (collision, see NOTES history below). Built 2026-09-07:
      Quick Stats, Alerts, Recent Orders + Recent Products, Quick Actions.
- [DONE] task-72 — Order management (Section 3.3) — split into
      task-74 through task-82.
  - [DONE] task-74 (schema) — Order.statusHistory/internalNotes/
        refundReason/refundedAt fields.
  - [DONE] task-75 (API) — GET /api/admin/orders — list/filter/CSV export.
  - [DONE] task-76 (API) — GET /api/admin/orders/[orderId] — full detail.
  - [DONE] task-77 (API) — POST .../actions — update_status/refund/add_note.
  - [DONE] task-78 (API) — POST .../send-email — buyer email via EmailJS.
  - [DONE] task-79 (API) — PATCH .../production-stage — t-shirt pipeline.
  - [DONE] task-80 (UI) — /admin/orders list page.
  - [DONE] task-81 (UI) — /admin/orders/[orderId] detail page.
  - [DONE] task-82 (UI) — T-shirt production tracker component.
- [DONE] task-73 — Users management (Section 3.4) — split into
      task-83 through task-88. Renumbered from task-40 (collision).
  - [DONE] task-83 (schema) — `BuyerAdminMeta` model.
  - [DONE] task-84 (API) — GET /api/admin/users — list w/ order aggregates.
  - [DONE] task-85 (API) — GET /api/admin/users/[buyerId] — detail.
  - [DONE] task-86 (API) — POST .../actions — deactivate/reset/email/note.
  - [DONE] task-87 (UI) — /admin/users list page.
  - [DONE] task-88 (UI) — /admin/users/[buyerId] detail page.
- [DONE] task-65 — Analytics (Section 3.5) — split into task-92/93.
  - [DONE] task-92 (API) — GET /api/admin/analytics.
  - [DONE] task-93 (UI) — app/admin/analytics/page.tsx.
- [DONE] task-42 — Admin Security Logs page (Section 3.6). UI:
      lib/hooks/useAdminSecurityLogs.ts +
      components/security-logs/AdminSecurityLogsList.tsx +
      app/admin/security-logs/page.tsx, self-scoped to `actor = currentAdmin.email`.
- [DONE] task-43 — Admin Vault page (Section 3.7) — reconciled: already
      satisfied by task-32 (`/admin/vault/[slug]`).
- [DONE] task-44 (API half) — Admin Profile: GET/PUT /api/admin/profile,
      POST /api/admin/profile/avatar, PUT .../password, PUT .../notifications.
- [DONE] task-44 (UI half) — /admin/profile page, 3 sections (Profile
      Info, Change Password, Notification Prefs).

### PHASE 3 (remainder) — item 5's fully-closed sub-phases

(Item 5 — super_admin_account_specification.md — stays [~] in the main
file; only its fully-[DONE] children are archived here. Phase 7/8/9/10
remain open in taskPlan.md.)

- [DONE] task-45 (API+UI) — /superAdmin/security-logs viewer: DataTable,
      filters (eventType/deviceType/geoCountry/date range), CSV export,
      expandable rows (Rule 38.9). lib/securityLogsQuery.ts (shared,
      unscoped for super-admin).
- [DONE] task-46 — Account Activity page (Rule 42.3) —
      lib/accountActivityQuery.ts + GET /api/superadmin/account-activity +
      /superAdmin/account-activity page. Read/display only, no schema change.
- [DONE] task-33 (shared) — Gatekeeper/device-bans page (see Phase 4 above).
- [DONE] task-47 — 2FA/TOTP enrollment, 6 micro-tasks, all closed 2026-09-12:
  - [DONE] task-47-schema-totp — AdminTotpCredential model + otplib/qrcode.
  - [DONE] task-47-api-totp-enroll — enrollment API, app/api/auth/totp/enroll/route.ts.
  - [DONE] task-47-api-totp-login-verify — login TOTP gate + verify endpoint.
  - [DONE] task-47-ui-totp-enrollment — enrollment screen.
  - [DONE] task-47-ui-totp-login-step — login page TOTP prompt.
  - [DONE] task-47-totp-setup-gate — middleware forced-enrollment redirect.

#### task-48+ sub-scope: [DONE] Phase 3 — Admin Management (Section 3.2)
All 6 parts closed (task-99, 94, 95, 96, 97, 98).
- [DONE] task-99 — API: POST /api/admin/create-admin. Renumbered from
      task-93 (collision, see NOTES history). New env var:
      EMAILJS_TEMPLATE_ID_ADMIN_ACCOUNT_CREATED.
- [DONE] task-94 — API: GET /api/superadmin/admin-management (list) +
      /[adminId] (detail). New lib/getAdminAuthUser.ts +
      lib/adminAccountStatus.ts. GAP FOUND & FIXED: task-99 wasn't
      persisting createdBy — added. GAP FOUND, NOT FIXED: "locked after
      5 failures" has no enforcement, display-only (see openFindings.md).
- [DONE] task-95 — API: admin actions — edit/deactivate/reactivate/
      reset-password/delete (5s delay per Rule 34.4). New env var:
      EMAILJS_TEMPLATE_ID_SUPERADMIN_ADMIN_PASSWORD_RESET (not yet
      created in EmailJS dashboard — flagged for developer).
- [DONE] task-96 — UI: /superAdmin/admin-management list page. Extended
      ConfirmationModal with confirmDelaySeconds prop.
- [DONE] task-97 — UI: /superAdmin/admin-management/create page.
- [DONE] task-98 — UI: /superAdmin/admin-management/[adminId]/edit page.

#### task-48+ sub-scope: [DONE] Phase 4 (remainder) — Backups (Rule 40)
All 6 micro-tasks (task-100 through task-105) closed.
- [DONE] task-100 — schema: `BackupLog` model.
- [DONE] task-101 — services: Google Drive upload helper (services/googleDrive.ts).
- [DONE] task-102 — script: scripts/runBackup.ts (npm run backup). Not
      smoke-tested end-to-end (no live credentials in sandbox).
- [DONE] task-103 — CI: .github/workflows/database-backup.yml (nightly
      cron + workflow_dispatch). Requires 9 repo secrets, not yet configured.
- [DONE] task-104 — API: GET /api/superadmin/backups (lowercase path,
      corrected from task file's camelCase). Read-only.
- [DONE] task-105 — UI: /superAdmin/backups page, 3-state status badge,
      read-only (no "Run Backup Now" button per Rule 40.6).

#### task-48+ sub-scope: [DONE] Phase 5 — Buyer Management (Section 3.8)
All 3 micro-tasks (task-106, 107, 108) closed. Distinct from admin's own
buyer list (task-84-88) — this is the super-admin's list/deactivate/
reactivate/reset/delete page.
- [DONE] task-106 — API: "delete" action added to existing
      app/api/admin/users/[buyerId]/actions/route.ts.
- [DONE] task-107 — UI: /superAdmin/buyer-management list page.
- [DONE] task-108 — UI: /superAdmin/buyer-management/[buyerId] detail page.

#### task-48+ sub-scope: [DONE] Phase 6 — Product & Order Mgmt w/ approval flow
All 4 micro-tasks (task-109 through 112) closed.
- [DONE] task-109 — schema: `pending-review` added to Product.status.
- [DONE] task-110 — API: admin product create/edit save as pending-review.
      GAP FOUND & FIXED (then found still broken, then actually fixed —
      see full correction history in git log for this task if needed):
      final state confirmed 2026-09-20 by direct code view —
      app/api/admin/products/route.ts has real, distinct GET (list) +
      POST (create) handlers, separate from [productId]/route.ts.
      Unrelated architecture gap (storefront doesn't read Product DB
      table at all) is unresolved — see docs/openFindings.md.
- [DONE] task-111 — API: super-admin approve/reject endpoints.
- [DONE] task-112 — UI: /superAdmin/products page, Pending Review filter.

### NOTES — resolved numbering collisions (historical)

- **RESOLVED — task-93 numbering collision (found + fixed 2026-09-12):**
  Used twice — admin analytics UI (closed 2026-09-08) and the Phase 3
  Admin Management split. Renumbered the create-admin task to task-99.
- **RESOLVED — task-04/10 and task-19/23 traceability gap (found + fixed
  2026-09-07):** 12 docs/tasks files cited in overviewProject.txt's
  CHANGE LOG but never written. Code was done and Layer-3 verified —
  documentation gap only. Back-filled with Rule 49.1 Rule 3 headers.
- **RESOLVED — task-38/39/40 numbering collision (found + fixed
  2026-09-07):** Each used twice — buyer-recovery Telegram split vs.
  Admin dashboard/Orders/Users items. Renumbered the still-open admin
  items to task-71/72/73.
