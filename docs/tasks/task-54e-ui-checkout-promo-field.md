# task-54e — ui-checkout-promo-field — "Have a promo code?" in the checkout order summary

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7 (§4.1 content, §7 toasts); cart_checkout_specification.md §4.2 step 3
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** task-54c, task-54d
**NEEDS:** task-54c, task-54d
**SETUP:** none
**FILES TO TOUCH:** components/checkout/CheckoutForm.tsx (existing), components/checkout/PromoCodeField.tsx (new), app/styles/ checkout stylesheet already used by the form (existing)
**DONE WHEN:**
- An expandable "Have a promo code?" field sits in the order summary; Apply calls `/api/checkout/validate-coupon` with the CSRF header.
- On success the summary shows a discount line, the new shipping and the new total, with toast `✓ Promo code applied — ₱{amount} off.` (free-shipping code: wording says shipping is free); on failure toast `✕ This promo code isn't valid or has expired.` and the totals stay unchanged.
- A Remove action clears the code and restores the original totals.
- The submit call sends only the code; the displayed total is never sent as authority.
- The code input follows Rule 18.1 sanitizing, 44px tap targets, focus-visible styles, and a disabled button with a loading state while applying (Rule 34.3).
- Works in light and dark theme and at 375px, 768px and 1280px.
- `npx tsc --noEmit` adds no new errors.

## Notes
- CheckoutForm.tsx is already 299 lines, so the field is its own component (Rule 31.4) and the form only holds the applied-coupon state.
- Decision (confirmed 2026-10-03, "best approach"): guests must get a `csrf_token` cookie before validate-coupon is called. `middleware.ts` only issues it on `/buyer`, `/admin`, `/superAdmin`, `/auth`, `/api/auth`, so add `/checkout/:path*` to its matcher (cookie issue only — no auth gate) as part of this task. `middleware.ts` is therefore also a FILE TO TOUCH for task-54e.

