# task-83 — BuyerAdminMeta Schema (Users Management, schema half)

**Spec section:** admin_account_specification.md Section 3.4.2 ("Add Internal Note")
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-73 split (first piece)
**Depends on:** none (first task in the task-73 split)
**Status:** DONE — built 2026-09-07

## What was built
- `prisma/schema.prisma` — added `BuyerAdminMeta`: `userId String @unique`,
  `internalNotes Json?` (array of `{ note, adminId, createdAt }`, same
  shape/append-only convention as `Order.internalNotes` from task-74/77),
  `createdAt`/`updatedAt`, `@@index([userId])`. Lazy-creation pattern,
  same precedent as `BuyerPaymentProfile` — no row exists until the
  first note is added.

## Why no other schema changes were needed for the rest of task-73
- **Deactivate/Reactivate (3.4.1/3.4.2):** will reuse Supabase Admin
  API's own `ban_duration` on the auth user directly (task-86) instead
  of a new `isActive` flag — Supabase already enforces this at sign-in,
  so a second local flag would be a second source of truth that could
  drift out of sync.
- **Reset Password (3.4.1/3.4.2):** will reuse the existing
  `BuyerRecovery.forgotPasswordResetTokenHash` /
  `forgotPasswordResetTokenExpiresAt` fields and `lib/passwordResetToken.ts`
  helpers (`generateResetToken`/`hashResetToken`, task-66) — an
  admin-initiated token skips the buyer's own Steps 1-3 identity
  verification (the admin is already authenticated) but lands on the
  exact same `/auth/reset-password?token=` page and `/api/auth/
  forgot-password/reset` route (task-68) the buyer's own flow uses.
- **Last login / IP / city (3.4.2 #1):** read from `SecurityLog`
  (`eventType: "login_success"`, `actor: <email>`, most recent row) —
  already captured per Rule 38, nothing new to store.
- **Account Activity (3.4.2 #3):** read from `AccountActivityLog`
  (Rule 42) — already captured, nothing new to store.
- **Order History (3.4.2 #2):** read from the existing `Order` table,
  filtered by `userId` — nothing new to store.

## Scope notes
- Could not run `npx prisma validate` or `npx prisma generate` in this
  sandbox — `binaries.prisma.sh` is outside the allowed network
  domains here (same limitation noted on every prior schema-change
  task). Run `npx prisma db push && npx prisma generate` in a real dev
  environment before starting task-84.
