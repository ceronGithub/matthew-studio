# task-54f — api-superadmin-coupons — super-admin coupon list / create / switch off

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7 (§4.1 "Admin side"); super_admin_account_specification.md (Manage Promotions) — NOT YET SPECCED, needs approval before building
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54a
**NEEDS:** task-54a
**SETUP:** none
**FILES TO TOUCH:** app/api/superadmin/coupons/route.ts (new: GET list, POST create), app/api/superadmin/coupons/[couponId]/route.ts (new: PATCH isActive / limit / expiry)
**DONE WHEN:**
- Super-admin only (same guard as the other app/api/superadmin routes), CSRF-checked on writes, `force-dynamic`, Rule 28 response shape.
- Create validates with zod: code 3-32 characters, upper-case letters and digits only (no hyphens — Rule 18.1 strips them from the checkout promo field), unique after normalization (409 on a duplicate, Rule 6); percentage between 1 and 100; fixed above 0; `scopeCategory` must be a real catalog category or null.
- PATCH can switch a coupon on or off and change `usageLimit` or `expiresAt`; coupons are never hard-deleted.
- Every create and change writes an audit entry via lib/auditLog.ts (Rule 6).
- `npx tsc --noEmit` adds no new errors.

## Notes
- Open question for the developer: the super-admin spec has a "Manage Promotions" permission for ordinary admins (already a value in lib/hooks/useCreateAdminForm.ts) but no coupon pages. v1 default: super-admin only. Extending to admins with that permission is a later step.
