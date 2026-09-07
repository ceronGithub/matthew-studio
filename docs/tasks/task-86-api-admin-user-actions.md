# Task 86 — API: POST /api/admin/users/[buyerId]/actions

**Fulfills spec section:** admin_account_specification.md Section
3.4.1 (Row Actions) and 3.4.2 (Actions — Reset Password / Deactivate
Account / Send Custom Email / Add Internal Note)

**taskPlan.md phase:** PHASE 3 (remainder) — item 4
(admin_account_specification.md) → task-73 (Users Management) split

**Dependency:** task-83 (BuyerAdminMeta schema) — DONE
             task-85 (buyer detail route, shares getBuyerAuthUser) — DONE
             task-66 (BuyerRecovery reset-token fields, reused here) — DONE

## What was built
`app/api/admin/users/[buyerId]/actions/route.ts` — single POST route,
`action` discriminator:
- `deactivate` / `reactivate` — Supabase Auth `ban_duration` flip, no
  new local flag (matches task-83/84's existing source of truth).
- `reset_password` — admin-initiated; reuses BuyerRecovery's
  forgot-password reset-token fields (task-66) rather than new schema.
  Emails a link to the existing `/auth/reset-password` page.
- `send_email` — custom compose-a-message email via a new dedicated
  EmailJS template (`EMAILJS_TEMPLATE_ID_ADMIN_BUYER_EMAIL`).
- `add_note` — appends to `BuyerAdminMeta.internalNotes` (upserted).

Also extracted `lib/getBuyerAuthUser.ts` (buyer-role-checked Supabase
Auth lookup) and refactored task-85's route to use it instead of its
own inline copy — same check, one place.

## New env vars (added to overviewProject.txt Section 7)
- `APP_URL` — builds the absolute reset-password link for the email.
- `EMAILJS_TEMPLATE_ID_ADMIN_PASSWORD_RESET` — vars: `to_email`, `reset_link`
- `EMAILJS_TEMPLATE_ID_ADMIN_BUYER_EMAIL` — vars: `to_email`, `subject`, `message`

Both EmailJS templates still need to be created in the EmailJS
dashboard before use (same manual-setup note as task-78's).

## Verification
- `npx tsc --noEmit` clean for both new/modified files (pre-existing
  unrelated errors elsewhere are the same sandbox
  Prisma-client-not-generated class noted in task-85's entry).
- Every action gated behind `getSessionAdmin()` + `getBuyerAuthUser()`
  — a non-buyer id 404s before any action runs.
