# task-55b — api-buyer-refund-request — POST a refund request

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** task-55a
**NEEDS:** task-55a
**SETUP:** none
**FILES TO TOUCH:** lib/refundValidation.ts (new, zod + reason list), lib/refundEligibility.ts (new, window rules), app/api/buyer/orders/[orderId]/refund-request/route.ts (new)
**DONE WHEN:**
- Buyer-only route with CSRF and rate limit; the order must belong to the buyer (else 404).
- Window rule, decided 2026-10-24 to follow /refund-policy: digital items within 7 days of purchase (paidAt); apparel within 14 days of delivery. Only Delivered/Cancelled orders qualify; outside the window returns a clear message.
- One pending request per order: app check first, then the `pendingOrderId` unique as backup (a P2002 race returns the same message).
- `refundAmount` is copied from `Order.total` server-side; the body carries only reason and note.
- Returns the Rule 28 shape; `npx tsc --noEmit` adds no new errors.
