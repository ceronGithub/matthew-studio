# task-78 — Admin Order Send-Email API

**Spec:** admin_account_specification.md Section 3.3.1 (Row Actions — "Send Email")
**Phase:** 3 (remainder) — item 4, task-72 order-management split
**Depends on:** task-74 (schema), task-76 (detail route — same order family)
**Status:** DONE — built 2026-09-07

## What was built
`POST /api/admin/orders/[orderId]/send-email/route.ts` — validates
`preset` (one of `shipped_tracking` | `order_confirmed` |
`general_update` | `custom`), `subject`, and `body`, resolves the
buyer's email (guestEmail direct, or a Supabase Auth lookup for
registered buyers), and sends via `sendEmail()` using one shared
EmailJS template.

## Design decision — one template, not one per preset
Per Rule 35.5 the convention is one EmailJS template per email type.
Here the "type" is "admin → buyer, order-related" — the *preset* is a
subject-line shortcut for the admin's convenience, not a different
kind of email. Modeling each preset as its own EmailJS template would
mean editing 4 templates in the dashboard every time the shared
layout changes. Instead, one template
(`EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL`) receives `preset_subject`,
`message`, and `order_id` as template variables.

## New env var (needs manual setup)
```
EMAILJS_TEMPLATE_ID_ADMIN_ORDER_EMAIL=
```
Create this template in the EmailJS dashboard (variables:
`to_email`, `preset_subject`, `message`, `order_id`) and add the ID
to `.env` / `.env.local`. Until set, `sendEmail()` fails cleanly
(`"Email service is not configured."`) rather than throwing.

## Verification
1. Create the EmailJS template and set the env var (step above).
2. `POST /api/admin/orders/[id]/send-email` with
   `{"preset":"shipped_tracking","subject":"Your order has shipped",
   "body":"..."}` as admin → 200, email arrives at the buyer's address.
3. Same call on a guest order (no `userId`) → still 200 (email works
   without an account).
4. Missing `subject`/`body`, or an unknown `preset` → 400.
5. Order with no email on file at all (shouldn't happen in practice,
   but defensively checked) → 400, "no email on file to send to."
6. Logged-out / buyer-role request → 401.
