# task-55d — api-admin-refund-decision — list, approve or deny, PayMongo refund

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** task-55a
**NEEDS:** task-55a
**SETUP:** none
**FILES TO TOUCH:** lib/paymongoClient.ts (existing, add createRefund), app/api/admin/refund-requests/route.ts (new, GET queue), app/api/admin/refund-requests/[requestId]/route.ts (new, PATCH approve/deny), lib/orderStatus.ts (existing, add Refunded), app/api/admin/orders/[orderId]/actions/route.ts (existing, reconcile "refund" action)
**DONE WHEN:**
- Admin-guarded, CSRF-protected; deny needs a note, approve may carry one.
- Approve calls the PayMongo refund API using `Order.paymongoPaymentId`; only on success it sets Order.status = "Refunded", refundedAt, refundReason, request status "approved", clears `pendingOrderId`, stores `paymongoRefundId`. A PayMongo failure leaves everything pending and returns a clear message.
- Buyer is notified (createNotification) on approve and deny; audit entry written.
- Status lists that name "Cancelled" learn "Refunded": lib/orderStatus.ts, app/api/admin/orders/route.ts, lib/hooks/useAdminOrderDetail.ts, components/admin/AdminOrdersList.tsx, components/admin/AdminOrderDetail.tsx.
- `npx tsc --noEmit` adds no new errors.
