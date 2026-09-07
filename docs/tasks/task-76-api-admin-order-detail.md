# task-76 — Admin Order Detail API

**Spec:** admin_account_specification.md Section 3.3.2 (#1-5)
**Phase:** 3 (remainder) — item 4, task-72 order-management split
**Depends on:** task-74 (schema), task-75 (list — same route family)
**Status:** DONE — built 2026-09-07

## What was built
`GET /api/admin/orders/[orderId]/route.ts`
- Auth: `getSessionAdmin()`, 401 if not admin/superAdmin.
- 404 if the order doesn't exist or is soft-deleted (Rule 6).
- Items: `OrderItem` rows joined to `Product` for `category`/
  `categoryLabel` (OrderItem only snapshots name/price/variant, never
  category) — best-effort join, falls back to `null` if the Product
  was since deleted.
- `hasTshirtItem` flag exposed so task-81's UI knows whether to render
  task-82's production-stage stepper.
- Buyer info: guest → `guestEmail` on the row; registered → Supabase
  Auth lookup for email + `accountCreatedAt`. Name/phone are `null` —
  not collected anywhere in this app's checkout flow (same documented
  gap as `app/api/orders/[orderId]/retry-payment/route.ts`).
- Timeline: built from `statusHistory` (Json array) when task-77 has
  started writing to it; falls back to a single "Created" entry from
  `order.createdAt` for orders that predate that route.
- Also returns: `internalNotes`, `refund` (`refundReason`/`refundedAt`),
  `shipping` (`courier`/`trackingNumber`/`address`), `productionStage`.

## Verification
1. `GET /api/admin/orders/[a real order id]` as a logged-in admin →
   200, full detail object with items/payment/timeline populated.
2. `GET /api/admin/orders/[a nonexistent id]` → 404, friendly message.
3. Order with a t-shirt item → `hasTshirtItem: true`.
4. Order with no `statusHistory` yet (pre-task-77) → `timeline` has
   exactly one "Created" entry, not empty.
5. `GET /api/admin/orders/[id]` while logged out / as a buyer → 401.
