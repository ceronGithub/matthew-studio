# task-55a — refund-schema — RefundRequest model + Refunded order status

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** none
**NEEDS:** none
**SETUP:** npx prisma db push && npx prisma generate
**FILES TO TOUCH:** prisma/schema.prisma (existing)
**DONE WHEN:**
- `RefundRequest` model exists (order, user, reason, note, refundAmount, status, pendingOrderId unique, reviewer fields, paymongoRefundId) with a relation to `Order`.
- `Order.status` comment lists `Refunded`; existing orders keep working (new relation only).
- `npx prisma db push` and `npx prisma generate` both succeed against the real database.
- `npx tsc --noEmit` adds no new errors.

## Notes
- Decided 2026-10-24: approving a refund sets `Order.status = "Refunded"` (new status, spec wording). The existing admin "refund" action still sets `Cancelled`; reconciling it is part of task-55d.
- `pendingOrderId @unique` is the DB-level guard (Rule 6) behind task-55b's "one pending request per order" check.
- Prisma 7 + Supabase: use `db push`, never `migrate dev/deploy` (Rule 37.2).
