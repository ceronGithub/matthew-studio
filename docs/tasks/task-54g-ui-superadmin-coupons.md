# task-54g — ui-superadmin-coupons — /superAdmin/coupons page

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7 (§4.1 "Admin side") — spec approved 2026-10-03 (Edit for limit/expiry split out as task-54h)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54f
**NEEDS:** task-54f
**SETUP:** none
**FILES TO TOUCH:** app/superAdmin/coupons/page.tsx (new), components/superAdmin/CouponManager.tsx (new), app/superAdmin/dashboard/page.tsx (existing, add a quick-action card)
**DONE WHEN:**
- The page lists coupons (code, type and value, used / limit, expiry, status) with loading, empty and error states (Rule 25).
- A create form (react-hook-form + zod) and an on/off switch per row, with the confirmation modal for switching a coupon off (Rule 34.4) and action-specific toasts (Rule 22).
- A "Coupons" quick-action card on the super-admin dashboard links to it.
- Responsive at 375px, 768px and 1280px; `npx tsc --noEmit` adds no new errors.

**BUILT 2026-10-03 (status [~] until checked in a browser):**
- Files: app/superAdmin/coupons/page.tsx, components/coupons/CouponManager.tsx, CouponTable.tsx, CouponForm.tsx, lib/hooks/useCoupons.ts, lib/hooks/useCouponForm.ts, app/styles/superAdminCoupons.css; dashboard card added.
- Deviation: components live in components/coupons/ (components/superAdmin/ does not exist; repo pattern is components/<feature>/). Hooks and CouponTable added to stay under the size limit.
- Deviation: react-hook-form is not installed and no form in the repo uses it, so the form follows lib/hooks/useAnnouncementForm.ts (useState) and validates with the shared createCouponSchema (zod). See docs/openFindings.md.
