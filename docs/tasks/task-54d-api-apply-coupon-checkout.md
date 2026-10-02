# task-54d — api-apply-coupon-checkout — apply the coupon when the Order is created

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7 ("recalculates the Order.total server-side before the PayMongo Payment Link is created")
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54b
**NEEDS:** task-54a, task-54b
**SETUP:** none
**FILES TO TOUCH:** app/api/checkout/route.ts (existing), lib/couponPricing.ts (existing, add reserve/release helpers)
**DONE WHEN:**
- `POST /api/checkout` accepts an optional `couponCode`, re-validates it with `applyCoupon` against the real cart, and ignores any client-sent discount or total.
- The Order is saved with `couponCode`, `discountAmount`, and `total = subtotal - discountAmount + shippingFee` (shipping is 0 for a free-shipping code); the PayMongo session is created for that total.
- Reserving a use is atomic: `usageCount` goes up only if it is still below `usageLimit` (single conditional update), so two buyers cannot both take the last use.
- If the PayMongo session fails and the Order is deleted (existing rollback), the reserved use is released in the same path.
- A coupon that became invalid between preview and submit returns a clear error and creates no Order.
- Orders without a coupon behave exactly as before. `/api/orders/[orderId]/retry-payment` still charges the stored `total`.
- `npx tsc --noEmit` adds no new errors.

## Notes
- v1 assumption: the use is reserved at order creation, not at payment. This is the only way to make the limit race-safe. Cost: an abandoned PENDING order keeps its use. Confirm this choice before building (also logged in docs/openFindings.md).
- One coupon per order, no stacking.
