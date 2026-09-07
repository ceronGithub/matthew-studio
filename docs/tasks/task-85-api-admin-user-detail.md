# Task 85 — API: GET /api/admin/users/[buyerId]

**Fulfills spec section:** admin_account_specification.md Section 3.4.2
(Buyer Details — Display Sections 1-3: Account Information, Order
History, Account Activity)

**taskPlan.md phase:** PHASE 3 (remainder) — item 4
(admin_account_specification.md) → task-73 (Users Management) split

**Dependency:** task-83 (BuyerAdminMeta schema) — DONE
             task-84 (GET /api/admin/users list route, pattern reference) — DONE

## What was built
`app/api/admin/users/[buyerId]/route.ts` — single GET route returning:
- Account info (email, name, createdAt, isActive, phone: null — not
  collected anywhere in this app's flow, same gap task-76/84 flag)
- Last login (SecurityLog `login_success`, city-level geo + IP)
- 5 most recent orders (id, date, total, status)
- Last 10 AccountActivityLog entries
- Internal notes (BuyerAdminMeta.internalNotes, task-83)

## Known gap (flagged, not blocking)
`recordAccountActivity()` (Rule 42.3) is currently only wired into
`app/superAdmin/layout.tsx`. No buyer-facing layout calls it yet, so
the "Account Activity" section of this route will return an empty
array for every buyer until that instrumentation is added as its own
task. The endpoint is still correct and ready — this is a data-source
gap, not a code gap.

## Verification
- `getSessionAdmin()` gate matches task-76/84's pattern exactly.
- Buyer existence check also rejects non-"buyer" role ids (an admin/
  super-admin id typed into the URL 404s instead of leaking their
  info through this endpoint).
- `npx tsc --noEmit` clean for this file (pre-existing unrelated
  errors in task-84's route.ts are a sandbox Prisma-client-generation
  limitation — see Files Changed note below).
