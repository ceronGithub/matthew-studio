# task-54b — coupon-pricing-logic — server-side validate + discount calculation helper

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54a
**NEEDS:** task-54a
**SETUP:** none
**FILES TO TOUCH:** lib/couponPricing.ts (new), lib/errorMessages.ts (existing, add `couponMessages`)
**DONE WHEN:**
- `applyCoupon(code, items, requiresShipping, subtotal)` normalizes the code (trim + upper-case), loads the Coupon, and returns either `{ ok: true, discountAmount, freeShipping, couponCode }` or `{ ok: false, reason }`.
- Rejects with a distinct reason for: not found or inactive, expired, usage limit reached, nothing in the cart matches `scopeCategory`, free-shipping code on a cart with no t-shirt.
- `percentage` applies to the eligible lines only (all lines when `scopeCategory` is null); `fixed` is capped at the eligible subtotal; the discount never exceeds the subtotal and is rounded to 2 decimals.
- `free_shipping` returns `discountAmount: 0` and `freeShipping: true`.
- No client-submitted amount is ever read: inputs are the code plus the server-built cart lines.
- All user-facing text lives in `couponMessages` (Rule 34.1), one sentence per reason, and the invalid/expired wording does not reveal which codes exist.
- `npx tsc --noEmit` adds no new errors.

## Notes
- Items come from `loadCartLineItems` in lib/cartPricing.ts (already available: each line has `category` and `lineTotal`).
- Pure calculation plus one Prisma read; it does not change `usageCount` (that happens at order creation, task-54d).
