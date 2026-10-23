# task-55c — ui-buyer-refund-request — "Request Refund" on the order page

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** task-55b
**NEEDS:** task-55b
**SETUP:** none
**FILES TO TOUCH:** components/buyer/RefundRequestForm.tsx (new), lib/hooks/useRefundRequest.ts (new), the buyer order detail component under components/buyer/ (existing, add the button), a buyer CSS file (existing)
**DONE WHEN:**
- Button shows only when the order is eligible (same rules as task-55b); a pending request shows "Refund requested" instead.
- Modal with reason dropdown and optional note (character counter); toast: "✓ Refund request submitted. We'll review it within 2-3 business days."
- Responsive at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.
