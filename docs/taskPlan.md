# Master Task Plan — matthew-studio

Fast-scan checklist tracker (Rule 49 Step 3). This file is the quick
index; **overviewProject.txt Section 5C** stays the authoritative
narrative status (per-spec detail, deviations, dates) — this file
never duplicates that detail, it just tracks the checklist state and
points to Section 5C / docs/tasks/*.md for the "why."

Update rule (per user request): every time a task below is completed,
this file is updated the SAME turn (Rule 16.1 / Rule 45 discipline) —
checkbox flipped, no separate reminder needed.

Legend: `[DONE]` `[~]` in progress `[ ]` not started
Confidence tag on reconciled (pre-numbering-convention) entries:
`(confirmed)` = verified against code/commit/spec text this session.
`(reconciled)` = task number backfilled from Section 5C / commit
messages; no docs/tasks/*.md file was ever written for it.

--------------------------------------------------------
## PHASE 1 — FOUNDATION (cart_checkout_specification.md)
- [DONE] 1a. Order/OrderItem/CartItem schema (confirmed)
- [DONE] 1b. Cart (drawer + CartItem API) (confirmed)
- [DONE] 1c. Checkout page + server-side validation (confirmed)
- [DONE] 1d. PayMongo Checkout Session creation (confirmed)
- [DONE] 1e. Webhook + Order status update (Rule 30) (confirmed)
- [DONE] 1f. Order confirmation page + status polling, incl.
        failed-status + retry-payment (confirmed)

## PHASE 2 — CORE BUYER EXPERIENCE
### buyer_order_tracking_specification.md
- [DONE] Order history list (Section 3.1) (reconciled — pre-numbering,
        no task-N file)
- [DONE] Order detail + cancel API (Section 3.2) (reconciled)
- [DONE] `/buyer/orders/[orderId]` tracking detail page — timeline,
        cancel/reorder/contact support, shared ConfirmationModal
        (reconciled)

### buyer_account_specification.md — [~] IN PROGRESS
- [DONE] 4.1 Downloads / License Delivery (reconciled)
- [DONE] 4.2 Profile + avatar upload (reconciled)
- [DONE] 4.3 Payment Methods — **task-01, task-02, task-03** (confirmed
        — filed .md, Layer-3 verified: vault service, API routes, UI)
- [DONE] 4.4 Subscription Management — **task-04, task-05, task-06**
        (confirmed via Section 5C text: schema / API / UI page — no
        individual .md files were ever written for these three)
- [DONE] 4.5 Support Tickets — **task-07** schema, **task-08**
        list/create+detail+reply+reopen API (confirmed — commit
        message literally says "task 08"), **task-09** list + new-
        ticket UI, **task-10** detail thread UI (all confirmed via
        Section 5C text; task-09/task-10 files were never written
        despite the work landing in the repo)
- [~] 4.6 Notifications — **task-11** schema (DONE), **task-12** API
        (DONE), **task-13** UI/bell (DONE), **task-14** wire triggers
        (DONE — all 3 sources: order_update, billing, ticket_reply).
        All sub-items complete; spec itself stays [~] only pending the
        unbuilt "announcement" source (depends on super-admin
        Announcements, not yet built — no-op, not a blocker).

## PHASE 3 — ADMIN & OVERSIGHT
### admin_account_specification.md — [~] IN PROGRESS
- [DONE] **task-19** Product.createdBy/updatedBy + AuditLog model
        (confirmed — referenced by name in task-24/task-27 files)
- [DONE] **task-20** GET list + detail routes, hasAdminPermission.ts
        (confirmed via Section 5C text)
- [DONE] **task-21** POST/PUT/DELETE product routes (confirmed —
        directly cross-referenced in task-24/25/26's "same 3 checks
        as every Task 21 route")
- [DONE] **task-22** admin product list UI (confirmed via Section 5C)
- [DONE] **task-23** admin product create/edit form UI (confirmed —
        directly cross-referenced in task-27's "Task 23's original
        placeholder copy")
- [ ] Remaining scope not started: dashboard (3.1), orders (3.3-3.4?),
      users, analytics, security logs, vault, profile — see spec
      Sections 3.1, 3.3–3.8 for exact numbering; not yet broken into
      tasks.

### super_admin_account_specification.md — [~] IN PROGRESS
- [DONE] Dashboard shell + health widget + activity log (reconciled)
- [DONE] SecurityLog model + logSecurityEvent() (Rule 38) (reconciled)
- [DONE] Device fingerprinting + geoip + anomaly detection foundation
        (reconciled)
- [DONE] AccountActivityLog model + recordAccountActivity() (Rule 42)
        (reconciled)
- [ ] Security Logs page (Section 3.3)
- [ ] Account Activity page (Section 3.4)
- [ ] Gatekeeper/device-bans viewer page + manual unban action
      (shared deliverable with gatekeeper_specification.md below)
- [ ] Phase 1 (2FA/TOTP enrollment) — not found in repo, flagged as a
      gap (Phase 2 work is already ahead of it — not blocking)
- [ ] Phases 3+ (admin management, vault, buyer management) — not
      started

### admin_support_ticket_specification.md — [DONE]
- [DONE] **task-15** getSessionAdmin.ts + GET list/detail routes
        (confirmed — filed .md, Layer-3 verified)
- [DONE] **task-16** POST reply / PUT status routes, wires
        createNotification() ticket_reply source (confirmed)
- [DONE] **task-17** admin ticket inbox UI (confirmed)
- [DONE] **task-18** admin ticket detail/reply UI (confirmed) — spec
        closed end to end

## PHASE 4 — SECURITY & ACCESS HARDENING
- [ ] vault_specification.md — front-end mockup done; backend
      (Sections 4/5/7/9/12.7-12.8) not started. Schema
      (AdminSession/VaultCredentials/GatekeeperEvent) already exists.
- [~] gatekeeper_specification.md — DeviceBan table, lib/gatekeeper.ts
      (checkDeviceBan / evaluateGatekeeperTriggers), wired into
      middleware.ts + login route — DONE. Missing: /superAdmin/
      gatekeeper viewer + manual-unban UI (same gap as the super-admin
      item above).
- [ ] buyer_password_recovery_specification.md — Telegram bot recovery
      flow (Rule 48 trio); buyer registration has no recovery path yet.

## PHASE 5 — CATALOG & PRODUCT FEATURES
### product_media_upload_specification.md — [DONE]
- [DONE] **task-24** cover image upload route (confirmed — filed .md,
        Layer-3 verified)
- [DONE] **task-25** gallery image routes, 8-image cap (confirmed —
        POST handler gap fixed same session it was caught)
- [DONE] **task-26** preview video upload route (confirmed)
- [DONE] **task-27** media UI in AdminProductForm (confirmed) — spec
        closed end to end for /admin/products (superAdmin/products
        side out of scope, no UI exists yet there)
- [ ] bulk_file_converter_and_pdf_renamer_specification.md — File
      Tools product, not started.

## PHASE 5B — FRONT-END MODERNIZATION
- [DONE] buyer_homepage_specification_done.md Section 13 audit —
        fully compliant, only Hero parallax fix needed (done).

## PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING
- [ ] sitewide_technical_seo_specification.md — sitemap/robots, global
      404/error boundaries, idle session timeout (Rule 32.5),
      anonymized traffic analytics (Rule 41)
- [ ] additional_platform_gaps_specification.md — coupons, refunds,
      OAuth login, buyer 2FA, transactional emails, shop filtering,
      dev env setup
- [ ] infra_ops_specification.md — CI/CD, Sentry, security
      headers/CSP, Blog CMS admin

--------------------------------------------------------
## RECONCILIATION NOTES (Rule 49.1 — logged once, not repeated per line)

- Numbered micro-task convention (docs/tasks/task-N-slug.md) started
  with task-01 (Payment Methods, Section 4.3) — everything in Phase 1
  and the early Phase 2 order-tracking items predates the convention
  entirely and was never numbered. This is expected, not a defect.
- task-04 through task-10 (Subscriptions + Support Tickets) and
  task-19 through task-23 (Product CRUD) were used in spirit (spec
  sections were tracked, work landed, Section 5C documents them by
  number) but **no individual docs/tasks/*.md file was ever written**
  for any of these 12 numbers. Per Rule 49.1 Rule 3, any future edit
  to these areas should get a proper task-N-slug.md file retroactively
  if the area is touched again, so traceability stops depending on
  prose reconstruction like this one.
- Going forward: before creating task-28 or higher, confirm against
  this file first — no gaps should be introduced again.

## NEXT UP (first not-[DONE] item, in phase order)
→ Phase 3: admin_account_specification.md remaining scope (dashboard,
  orders, users, analytics, security logs, vault, profile) — OR
  Phase 4/6 items, whichever the developer prioritizes next.
