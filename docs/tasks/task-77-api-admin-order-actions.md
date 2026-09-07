# task-77 — Admin Order Actions API (status / refund / notes)

**Spec:** admin_account_specification.md Section 3.3.1 (Row Actions) / 3.3.2 (Actions)
**Phase:** 3 (remainder) — item 4, task-72 order-management split
**Depends on:** task-74 (schema), task-76 (detail route — same order family)
**Status:** DONE — built 2026-09-07

## What was built
`POST /api/admin/orders/[orderId]/actions/route.ts` — single route,
`action` field in the body picks the handler:

- `update_status` — validates against the 5 known statuses, appends a
  `{status, adminId, note, createdAt}` entry to `Order.statusHistory`,
  notifies the buyer via `createNotification()` (type `order_update`)
  if `userId` is set.
- `refund` — requires a non-empty `refundReason`, sets
  `refundReason`/`refundedAt`, flips `status` to `"Cancelled"` (per
  the spec's own badge legend: "Cancelled — refunded or cancelled"),
  appends a matching `statusHistory` entry, notifies the buyer (type
  `billing`) if `userId` is set.
- `add_note` — appends `{note, adminId, createdAt}` to
  `Order.internalNotes`. Never notifies the buyer — internal only,
  per spec's explicit "not shown to buyer".

Every successful call logs a `SecurityLog` `admin_action` event (Rule
38) with a `details` string naming the order and action. Validation
failures (400s) don't log — the order was never touched.

## Known gap
Guest orders (`guestEmail` only, no `userId`) never receive a
notification for status/refund changes — `createNotification()`
requires a `userId`. The buyer still sees updated status if they
check via the guest order-lookup flow; there is no notification
channel for guests in this app's current design. Flagged, not fixed
here — would need email-based order-update notices (task-78's
send-email route can be used manually as a workaround today).

## Verification
1. `POST /api/admin/orders/[id]/actions` with
   `{"action":"update_status","status":"Shipped","note":"via courier"}`
   as admin → 200, `Order.status` becomes `Shipped`, `statusHistory`
   grows by one entry, buyer (if registered) gets a notification.
2. `POST .../actions` with `{"action":"refund","refundReason":"..."}`
   → 200, `status` becomes `Cancelled`, `refundedAt` set.
3. `POST .../actions` with `{"action":"add_note","note":"..."}` →
   200, `internalNotes` grows, no notification sent.
4. Missing/invalid `status` or empty `refundReason`/`note` → 400 with
   a specific message, no DB write, no SecurityLog entry.
5. Logged-out / buyer-role request → 401.
