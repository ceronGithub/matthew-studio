# task-55c — ui-buyer-refund-request — "Request Refund" on the order page

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** task-55b
**NEEDS:** task-55b
**SETUP:** none
**FILES TO TOUCH:** components/buyer/RefundRequestForm.tsx (new), lib/hooks/useRefundRequest.ts (new), components/buyer/OrderTrackingDetail.tsx (existing, add the button), lib/hooks/useBuyerOrderDetail.ts (existing, add refund type + markRefundPending), app/api/buyer/orders/[orderId]/route.ts (existing, add the refund field), app/styles/buyerOrderDetail.css (existing)
**DONE WHEN:**
- Button shows only when the order is eligible (same rules as task-55b); a pending request shows "Refund requested" instead.
- Modal with reason dropdown and optional note (character counter); toast: "✓ Refund request submitted. We'll review it within 2-3 business days."
- Responsive at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.

## Notes
- The button reads `refund.canRequest` / `refund.hasPending` from GET /api/buyer/orders/[orderId], which calls lib/refundEligibility.ts — so the button and the POST route use one set of rules. The two extra files (GET route, useBuyerOrderDetail) were added to FILES TO TOUCH on 2026-10-24 for that reason.
