# task-54h — ui-superadmin-coupon-edit — change a coupon's limit / expiry

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes, "Admin side") — NOT YET SPECCED, needs approval before building
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54g
**NEEDS:** task-54g
**SETUP:** none
**FILES TO TOUCH:** components/coupons/CouponTable.tsx (existing, add an Edit button), components/coupons/CouponEditForm.tsx (new), lib/hooks/useCouponEdit.ts (new), components/coupons/CouponManager.tsx (existing, open the edit modal), app/styles/superAdminCoupons.css (existing)
**DONE WHEN:**
- Each row has an Edit button that opens a modal for usage limit and expiry only (code, type, value and category stay locked).
- Saving calls PATCH /api/superadmin/coupons/[couponId]; a limit below the amount already used shows the API's message under the field.
- Action-specific success and error toasts (Rule 22); the list refreshes after saving.
- Responsive at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.
