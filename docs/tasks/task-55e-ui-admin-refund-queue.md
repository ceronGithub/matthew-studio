# task-55e — ui-admin-refund-queue — refund requests queue page

**Fulfills:** additional_platform_gaps_specification.md §4.2 (Refund Request & Processing)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-55)
**Dependency:** task-55d
**NEEDS:** task-55d
**SETUP:** none
**FILES TO TOUCH:** app/admin/refund-requests/page.tsx (new), components/admin/RefundRequestsList.tsx (new), lib/hooks/useRefundRequests.ts (new), a CSS file under app/styles/ (new), admin nav entry (existing)
**DONE WHEN:**
- Paginated queue, newest first, status filter; loading, empty and error states (Rule 25).
- Approve and Deny each open a confirmation modal with the order and amount named (Rule 34.4); deny requires a note.
- Action-specific toasts; the list refreshes after each decision.
- Responsive at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.
