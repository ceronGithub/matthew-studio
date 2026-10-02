# task-54c — api-validate-coupon — POST /api/checkout/validate-coupon

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7 (§6 endpoint table)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54b
**NEEDS:** task-54b
**SETUP:** none
**FILES TO TOUCH:** app/api/checkout/validate-coupon/route.ts (new)
**DONE WHEN:**
- `POST { code }` returns the Rule 28 shape with `discountAmount`, `freeShipping`, `shippingFee` and the new `total`, all computed on the server from the buyer's or guest's real cart.
- The route starts with `export const dynamic = "force-dynamic"`, checks CSRF (Rule 32.2) first, and validates the body with zod.
- It is rate limited (Rule 32.1, 10 requests per 15 minutes per IP, 429 on hit) so codes cannot be guessed, and logs `rate_limit_hit` per Rule 38.10.
- Invalid, expired, used-up and out-of-scope codes return a clear message from `couponMessages`, never a silent success.
- It does not change `usageCount` and does not create an Order.
- `npx tsc --noEmit` adds no new errors.

## Notes
- Identity comes from `resolveCartIdentity` (guests can use coupons, like the rest of checkout).
- This route only previews the discount for the UI; task-54d re-validates when the order is created, so a stale preview can never fix the price.
